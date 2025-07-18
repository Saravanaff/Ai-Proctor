import cv2
import mediapipe as mp
import numpy as np
import time

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)

cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, img = cap.read()
    if not success:
        break

    start = time.time()
    h, w, _ = img.shape
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(img_rgb)

    if result.multi_face_landmarks:
        for face_landmarks in result.multi_face_landmarks:
            # Intrinsics
            focal_length = w
            cam_matrix = np.array([
                [focal_length, 0, h / 2],
                [0, focal_length, w / 2],
                [0, 0, 1]
            ])
            dist_coeffs = np.zeros((4, 1), dtype=np.float64)

            # SolvePnP reference points
            face_3d = []
            face_2d = []
            for idx in [33, 263, 1, 61, 199]:
                pt = face_landmarks.landmark[idx]
                x, y = int(pt.x * w), int(pt.y * h)
                face_2d.append([x, y])
                face_3d.append([x, y, pt.z])
            face_3d = np.array(face_3d, dtype=np.float64)
            face_2d = np.array(face_2d, dtype=np.float64)

            success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_coeffs)

            # ==== LEFT EYE ====
            left_iris = face_landmarks.landmark[468]
            left_outer = face_landmarks.landmark[362]
            left_inner = face_landmarks.landmark[263]
            left_top = face_landmarks.landmark[386]
            left_bottom = face_landmarks.landmark[374]

            left_iris_2d = (int(left_iris.x * w), int(left_iris.y * h))
            left_iris_3d = np.array([[left_iris.x * w, left_iris.y * h, left_iris.z * 3000]], dtype=np.float64)
            left_proj, _ = cv2.projectPoints(left_iris_3d, rot_vec, trans_vec, cam_matrix, dist_coeffs)
            left_proj_point = (int(left_proj[0][0][0]), int(left_proj[0][0][1]))
            cv2.line(img, left_iris_2d, left_proj_point, (0, 255, 255), 2)

            # Horizontal ratio
            lx1 = left_inner.x
            lx2 = left_outer.x
            lxc = left_iris.x
            l_h_ratio = (lxc - lx1) / (lx2 - lx1 + 1e-6)

            # Vertical ratio
            ly1 = left_top.y
            ly2 = left_bottom.y
            lyc = left_iris.y
            l_v_ratio = (lyc - ly1) / (ly2 - ly1 + 1e-6)

            # Classify gaze
            if l_h_ratio < 0.35:
                l_dir = "Looking Left"
            elif l_h_ratio > 0.65:
                l_dir = "Looking Right"
            else:
                l_dir = "Looking Center"

            if l_v_ratio < 0.35:
                l_dir += " & Up"
            elif l_v_ratio > 0.65:
                l_dir += " & Down"

            cv2.putText(img, l_dir, (left_iris_2d[0] - 40, left_iris_2d[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

            # ==== RIGHT EYE ====
            right_iris = face_landmarks.landmark[473]
            right_outer = face_landmarks.landmark[33]
            right_inner = face_landmarks.landmark[133]
            right_top = face_landmarks.landmark[159]
            right_bottom = face_landmarks.landmark[145]

            right_iris_2d = (int(right_iris.x * w), int(right_iris.y * h))
            right_iris_3d = np.array([[right_iris.x * w, right_iris.y * h, right_iris.z * 3000]], dtype=np.float64)
            right_proj, _ = cv2.projectPoints(right_iris_3d, rot_vec, trans_vec, cam_matrix, dist_coeffs)
            right_proj_point = (int(right_proj[0][0][0]), int(right_proj[0][0][1]))
            cv2.line(img, right_iris_2d, right_proj_point, (0, 255, 255), 2)

            # Horizontal ratio
            rx1 = right_inner.x
            rx2 = right_outer.x
            rxc = right_iris.x
            r_h_ratio = (rxc - rx1) / (rx2 - rx1 + 1e-6)

            # Vertical ratio
            ry1 = right_top.y
            ry2 = right_bottom.y
            ryc = right_iris.y
            r_v_ratio = (ryc - ry1) / (ry2 - ry1 + 1e-6)

            # Classify gaze
            if r_h_ratio < 0.35:
                r_dir = "Looking Left"
            elif r_h_ratio > 0.65:
                r_dir = "Looking Right"
            else:
                r_dir = "Looking Center"

            if r_v_ratio < 0.35:
                r_dir += " & Up"
            elif r_v_ratio > 0.65:
                r_dir += " & Down"

            cv2.putText(img, r_dir, (right_iris_2d[0] - 40, right_iris_2d[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

            # Optional: draw landmarks
            # mp_drawing.draw_landmarks(
            #     image=img,
            #     landmark_list=face_landmarks,
            #     connections=mp_face_mesh.FACEMESH_TESSELATION,
            #     connection_drawing_spec=drawing_spec
            # )

    # FPS
    end = time.time()
    fps = 1 / (end - start)
    cv2.putText(img, f"FPS: {int(fps)}", (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

    cv2.imshow("Eye Gaze Direction + Classification", img)
    if cv2.waitKey(5) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
