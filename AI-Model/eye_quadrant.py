import cv2
import mediapipe as mp
import numpy as np

# Init MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, refine_landmarks=True)

# Start webcam
cap = cv2.VideoCapture(1)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            def get_point(id):
                lm = face_landmarks.landmark[id]
                return int(lm.x * w), int(lm.y * h)

            def up_down_ratio(o_cor,i_cor, iris_center,iris_cor,t1,t2,lid):
            # Key points
                p33 = get_point(o_cor)
                p133 = get_point(i_cor)
                p468 = get_point(iris_center)
                p469 = get_point(iris_cor)
                p161 = get_point(t1)
                p173 = get_point(t2)
                p159 = get_point(lid)

                # Lines
                cv2.circle(frame, p159, 4, (0, 255, 0), -1)  # Point 159
                cv2.line(frame, p161, p173, (0, 0, 255), 2)
                cv2.line(frame, (p161[0], (p161[1] + p173[1]) // 2), (p173[0], (p161[1] + p173[1]) // 2), (0, 165, 255), 1)

                # Iris radius & mask
                radius = int(np.linalg.norm(np.array(p468) - np.array(p469)))
                iris_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.circle(iris_mask, p468, radius, 255, -1)

                # Horizontal split line
                y_line = int((p33[1] + p133[1]) / 2)
                above_mask = np.zeros((h, w), dtype=np.uint8)
                below_mask = np.zeros((h, w), dtype=np.uint8)
                above_mask[:y_line, :] = 255
                below_mask[y_line:, :] = 255

                # Area split
                iris_above = cv2.bitwise_and(iris_mask, iris_mask, mask=above_mask)
                iris_below = cv2.bitwise_and(iris_mask, iris_mask, mask=below_mask)

                # Area calculation
                total_area = cv2.countNonZero(iris_mask)
                above_area = cv2.countNonZero(iris_above)
                below_area = cv2.countNonZero(iris_below)

                # Ratio and direction
                ratio = above_area / total_area if total_area > 0 else 0
                if ratio > 0.7:
                    direction = "Looking Up"
                elif ratio < 0.45:
                    direction = "Looking Down"
                else:
                    direction = "Looking Center"

                # Additional check with 159
                y_mid_iris = int((p161[1] + p173[1]) / 2)
                if p159[1] >= y_mid_iris:
                    direction = "Looking Down (159 check)"

                print(direction)

                # Debug draw
                cv2.circle(frame, p468, radius, (255, 0, 0), 2)
                cv2.putText(frame, f"Above: {above_area}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
                cv2.putText(frame, f"Below: {below_area}", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                cv2.putText(frame, f"Gaze: {direction}", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)

    
    # up_down_ratio(33, 133, 468, 469, 161, 173, 159)
    up_down_ratio(263, 362, 473, 476, 388, 398, 386)

    cv2.imshow("Iris Gaze Estimation", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
