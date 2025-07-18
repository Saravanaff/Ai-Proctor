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

    x_angle, y_angle = angles[0] * 360, angles[1] * 360

    if y_angle < -20:
        head_result = "Right"
    elif y_angle > 20:
        head_result = "Left"
    elif x_angle < -15:
        head_result = "Down"
    elif x_angle > 20:
        head_result = "Up"
    else:
        head_result = "Forward"

    def get_landmark_point(id):
        lm = facelm.landmark[id]
        return int(lm.x * w), int(lm.y * h), lm.x

    def up_down(o_cor, i_cor, iris_center, iris_cor, t1, t2, lid):
        o_cor = get_landmark_point(o_cor)
        i_cor = get_landmark_point(i_cor)
        iris_center = get_landmark_point(iris_center)
        iris_cor = get_landmark_point(iris_cor)
        t1 = get_landmark_point(t1)
        t2 = get_landmark_point(t2)
        lid = get_landmark_point(lid)

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

    def direction(o_cor, i_cor, iris_right, iris_left):
        x_o_cor, y_o_cor, norm_o_cor = get_landmark_point(o_cor)
        x_i_cor, y_i_cor, norm_i_cor = get_landmark_point(i_cor)
        x_iris_right, y_iris_right, norm_iris_right = get_landmark_point(iris_right)
        x_iris_left, y_iris_left, norm_iris_left = get_landmark_point(iris_left)

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

        if gaze_direction == "Center":
            if o_cor == 163:
                gaze_direction = up_down(33, 133, 468, 469, 161, 173, 159)
            else:
                gaze_direction = up_down(263, 362, 473, 476, 388, 398, 386)

        return gaze_direction

    eyes[0] = direction(390, 384, 474, 476)  # Left eye
    eyes[1] = direction(163, 157, 471, 469)  # Right eye

    return head_result, eyes
