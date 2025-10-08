import numpy as np
import cv2
import mediapipe as mp
from concurrent.futures import ThreadPoolExecutor
from core import constants
import threading

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

def direction(facelm, w, h):
    face_3d = []
    face_2d = []
    for idx, lm in enumerate(facelm.landmark):
        if idx in [33, 263, 1, 61, 291, 199]:
            x, y = int(lm.x * w), int(lm.y * h)
            face_2d.append([x, y])
            face_3d.append([x, y, lm.z])
    
    face_2d = np.array(face_2d, dtype=np.float64)
    face_3d = np.array(face_3d, dtype=np.float64)

    focal_length = w
    cam_matrix = np.array([
        [focal_length, 0, h / 2],
        [0, focal_length, w / 2],
        [0, 0, 1]
    ])
    dis_matrix = np.zeros((4, 1), dtype=np.float64)

    success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dis_matrix)
    rmat, _ = cv2.Rodrigues(rot_vec)
    angles, *_ = cv2.RQDecomp3x3(rmat)

    x_angle, y_angle = angles[0]*360, angles[1]*360
    if y_angle < -15:
        return "Right"
    elif y_angle > 15:
        return "Left"
    elif x_angle < -15:
        return "Down"
    elif x_angle > 15:
        return "Up"
    
    return "Forward"

def head_for_scan(rgb_img):
    head = "Error"
    try:
        face_mesh = get_face_mesh()
        results = face_mesh.process(rgb_img)
        h, w, _ = rgb_img.shape

        if results.multi_face_landmarks:
            facelm = results.multi_face_landmarks[0]
            head  =  direction(facelm, w, h)
    except Exception as e:
        print(f"Error in head position detection: {e}")
        head = "Error"

    return head


def process_head_position_data(buffer, userId, examId):

    head = "Error"

    image_array = np.frombuffer(buffer, dtype=np.uint8)
    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    try:
        face_mesh = get_face_mesh()
        results = face_mesh.process(rgb_img)
        h, w, _ = img.shape

        if results.multi_face_landmarks:
            facelm = results.multi_face_landmarks[0]
            head  =  direction(facelm, w, h)
    except Exception as e:
        print(f"Error in head position detection: {e}")
        head = "Error"

    print(f"Head position for user {userId}: {head}")

    code = 0
    if head == "Error":
        code = -1
    
    data = {"headPos": head}
    result = {
        "userId": userId,
        "examId": examId,
        "data": data,
        "code": code
    }
    return result

def head_functionality(sio):
    @sio.on("headPosition")
    def add_in_queue(data):
        constants.head_queue.put(data)
    
def handle_head_position(sio):
    while True:
        data = constants.head_queue.get()
        buffer = data["buffer"]
        userId = data["user_id"]
        examId = data["exam_id"]
        
        future = executor.submit(process_head_position_data, buffer, userId, examId)

        def emit_result(future):
            try:
                result = future.result()
                if sio.connected:
                    sio.emit("headPositionRes", result)
            except Exception as e:
                print(f"Error in head position processing: {e}")
                error_result = {
                    "userId": userId,
                    "examId": examId,
                    "data": {"headPos": "Error"},
                    "code": -1
                }
                if sio.connected:
                    sio.emit("headPositionRes", error_result)

        future.add_done_callback(emit_result)

def cleanup_head_functionality():
    global executor
    if executor:
        executor.shutdown(wait=True)
        print("Head functionality cleaned up.")

        