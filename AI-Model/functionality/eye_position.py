import numpy as np
import cv2
import mediapipe as mp
from threading import Lock
from concurrent.futures import ThreadPoolExecutor
import threading

# Configuration
MAX_WORKERS = 4  # Adjust based on your server capacity
FACE_MESH_CONFIG = {
    'static_image_mode': True,
    'refine_landmarks': True,
    'max_num_faces': 1,
    'min_detection_confidence': 0.5,
    'min_tracking_confidence': 0.5
}

mp_face_mesh = mp.solutions.face_mesh
# Thread-local storage for face mesh instances
thread_local = threading.local()

# Thread pool for handling multiple users
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def get_face_mesh():
    """Get thread-local face mesh instance"""
    if not hasattr(thread_local, 'face_mesh'):
        thread_local.face_mesh = mp_face_mesh.FaceMesh(**FACE_MESH_CONFIG)
    return thread_local.face_mesh

def get_landmark_point(facelm, id, w, h):
    lm = facelm.landmark[id]
    return int(lm.x * w), int(lm.y * h), lm.x

def up_down(o_cor, i_cor, iris_center, iris_cor, t1, t2, lid, facelm, w, h):
    o_cor = get_landmark_point(facelm, o_cor, w, h)
    i_cor = get_landmark_point(facelm, i_cor, w, h)
    iris_center = get_landmark_point(facelm, iris_center, w, h)
    iris_cor = get_landmark_point(facelm, iris_cor, w, h)
    t1 = get_landmark_point(facelm, t1, w, h)
    t2 = get_landmark_point(facelm, t2, w, h)
    lid = get_landmark_point(facelm, lid, w, h)

    radius = int(np.linalg.norm(np.array(iris_center) - np.array(iris_cor)))
    iris_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(iris_mask, iris_center[:2], radius, 255, -1)

    y_line = int((o_cor[1] + i_cor[1]) / 2)
    above_mask = np.zeros((h, w), dtype=np.uint8)
    below_mask = np.zeros((h, w), dtype=np.uint8)
    above_mask[:y_line, :] = 255
    below_mask[y_line:, :] = 255

    iris_above = cv2.bitwise_and(iris_mask, iris_mask, mask=above_mask)
    iris_below = cv2.bitwise_and(iris_mask, iris_mask, mask=below_mask)

    total_area = cv2.countNonZero(iris_mask)
    above_area = cv2.countNonZero(iris_above)
    below_area = cv2.countNonZero(iris_below)

    ratio = above_area / total_area if total_area > 0 else 0
    if ratio > 0.7:
        direction = "Up"
    elif ratio < 0.45:
        direction = "Down"
    else:
        direction = "Center"

    y_mid_iris = int((t1[1] + t2[1]) / 2)
    if lid[1] >= y_mid_iris:
        direction = "Down"
    
    return direction

def direction(o_cor, i_cor, iris_right, iris_left, facelm, w, h):
    x_o_cor, y_o_cor, norm_o_cor = get_landmark_point(facelm, o_cor, w, h)
    x_i_cor, y_i_cor, norm_i_cor = get_landmark_point(facelm, i_cor, w, h)
    x_iris_right, y_iris_right, norm_iris_right = get_landmark_point(facelm, iris_right, w, h)
    x_iris_left, y_iris_left, norm_iris_left = get_landmark_point(facelm, iris_left, w, h)

    eye_width = norm_o_cor - norm_i_cor
    iris_center = (norm_iris_right + norm_iris_left) / 2
    iris_ratio = (iris_center - norm_i_cor) / eye_width

    if o_cor == 163:
        if iris_ratio < 0.35:
            gaze_direction = "Left"
        elif iris_ratio > 0.65:
            gaze_direction = "Right"
        else:
            gaze_direction = "Center"
    else:
        if iris_ratio < 0.35:
            gaze_direction = "Right"
        elif iris_ratio > 0.65:
            gaze_direction = "Left"
        else:
            gaze_direction = "Center"

    # if gaze_direction == "Center":
    #     if o_cor == 163:
    #         gaze_direction = up_down(33, 133, 468, 469, 161, 173, 159, facelm, w, h)
    #     else:
    #         gaze_direction = up_down(263, 362, 473, 476, 388, 398, 386, facelm, w, h)

    return gaze_direction

def process_eye_position_data(buffer, userId, examId):
    """Process eye position data in a separate thread"""
    eyes = ["Error", "Error"]
    
    try:
        # Get thread-local face mesh instance
        face_mesh = get_face_mesh()
        
        # Decode image
        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Process face landmarks
        results = face_mesh.process(rgb_img)
        h, w, _ = img.shape

        if results.multi_face_landmarks:
            facelm = results.multi_face_landmarks[0]
            eyes[0] = direction(390, 384, 474, 476, facelm, w, h)
            eyes[1] = direction(163, 157, 471, 469, facelm, w, h)

    except Exception as e:
        print(f"Error processing eye position for user {userId}: {e}")
        eyes = ["Error", "Error"]

    data = {"leftEye": eyes[0], "rightEye": eyes[1]}
    print(f"User {userId} eye data: {data}")
    
    code = 0
    if eyes[0] == "Error" or eyes[1] == "Error":
        code = -1 

    result = {
        "userId": userId,
        "examId": examId,
        "data": data,
        "code": code
    }
    
    return result

def eye_functionality(sio):
    @sio.on("eyePosition")
    def handle_eye_position(data):
        buffer = data["buffer"]
        userId = data["user_id"]
        examId = data["exam_id"]
        
        # Submit task to thread pool for processing
        future = executor.submit(process_eye_position_data, buffer, userId, examId)
        
        # Add callback to emit result when processing is complete
        def emit_result(future):
            try:
                result = future.result()
                sio.emit("eyePositionRes", result)
            except Exception as e:
                print(f"Error in eye position processing: {e}")
                error_result = {
                    "userId": userId,
                    "examId": examId,
                    "data": {"leftEye": "Error", "rightEye": "Error"},
                    "code": -1
                }
                if sio.connected:
                    sio.emit("eyePositionRes", error_result)
        
        future.add_done_callback(emit_result)

def cleanup_eye_functionality():
    """Cleanup function to properly shutdown the thread pool"""
    global executor
    if executor:
        executor.shutdown(wait=True)
        print("Eye position thread pool shutdown complete")