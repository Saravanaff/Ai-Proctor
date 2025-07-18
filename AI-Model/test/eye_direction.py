import cv2
import mediapipe as mp
import numpy as np
import time

# Initialize FaceMesh with iris landmarks
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,  # Required for iris detection
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Drawing setup
mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)

# Start webcam
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
            # Camera matrix
            focal_length = w
            cam_matrix = np.array([
                [focal_length, 0, h / 2],
                [0, focal_length, w / 2],
                [0, 0, 1]
            ])
            dist_coeffs = np.zeros((4, 1), dtype=np.float64)

            # Use face mesh points for projection
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

            # ===== Left Iris (landmark 468) =====
            left_iris = face_landmarks.landmark[468]
            left_iris_3d = np.array([[
                left_iris.x * w,
                left_iris.y * h,
                left_iris.z * 3000
            ]], dtype=np.float64)
            left_iris_2d = (int(left_iris.x * w), int(left_iris.y * h))
            left_proj, _ = cv2.projectPoints(left_iris_3d, rot_vec, trans_vec, cam_matrix, dist_coeffs)
            left_proj_point = (int(left_proj[0][0][0]), int(left_proj[0][0][1]))
            cv2.line(img, left_iris_2d, left_proj_point, (0, 255, 255), 2)

            # ===== Right Iris (landmark 473) =====
            right_iris = face_landmarks.landmark[473]
            right_iris_3d = np.array([[
                right_iris.x * w,
                right_iris.y * h,
                right_iris.z * 3000
            ]], dtype=np.float64)
            right_iris_2d = (int(right_iris.x * w), int(right_iris.y * h))
            right_proj, _ = cv2.projectPoints(right_iris_3d, rot_vec, trans_vec, cam_matrix, dist_coeffs)
            right_proj_point = (int(right_proj[0][0][0]), int(right_proj[0][0][1]))
            cv2.line(img, right_iris_2d, right_proj_point, (0, 255, 255), 2)

            # Draw face mesh (optional)
            # mp_drawing.draw_landmarks(
            #     image=img,
            #     landmark_list=face_landmarks,
            #     connections=mp_face_mesh.FACEMESH_TESSELATION,
            #     connection_drawing_spec=drawing_spec
            # )

    # Show FPS
    end = time.time()
    fps = 1 / (end - start)
    cv2.putText(img, f"FPS: {int(fps)}", (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

    # Display output
    cv2.imshow("Eye Gaze Direction", img)

    if cv2.waitKey(5) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
