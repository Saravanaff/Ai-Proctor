import numpy as np
import cv2
import mediapipe as mp


# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True)



def detect_head_direction(img: np.ndarray) -> tuple[str, list[str]]:
    head_result = "Error"
    eyes = ["Error", "Error"]
    res = face_mesh.process(img)
    h, w, _ = img.shape

    if not res.multi_face_landmarks:
        return head_result, eyes

    face_3d = []
    face_2d = []
    facelm = res.multi_face_landmarks[0]

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
    print(f"x_angle: {x_angle}, y_angle: {y_angle}")
    if y_angle < -10:
        head_result = "Right"
    elif y_angle > 10:
        head_result = "Left"
    elif x_angle < -10:
        head_result = "Down"
    elif x_angle > 10:
        head_result = "Up"
    else:
        head_result = "Forward"


    return head_result 
