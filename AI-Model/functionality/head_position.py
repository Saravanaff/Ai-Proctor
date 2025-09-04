import numpy as np
import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True)

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
    if y_angle < -10:
        return "Right"
    elif y_angle > 10:
        return "Left"
    elif x_angle < -10:
        return "Down"
    elif x_angle > 10:
        return "Up"
    
    return "Forward"

def head_functionality(sio):
    @sio.on("headPosition")
    def handle_head_position(data):
        buffer = data["buffer"]
        userId = data["user_id"]
        examId = data["exam_id"]
        head = "Error"
        
        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        results = face_mesh.process(rgb_img)
        h, w, _ = img.shape

        if results.multi_face_landmarks:
            facelm = results.multi_face_landmarks[0]
            head  =  direction(facelm, w, h)

        code =0
        if head == "Error":
            code = 1

        data = {"headPosition": head}

        sio.emit("headPositionRes", {
            "UserId": userId,
            "ExamId": examId,
            "data": data,
            "code": code
        })


        