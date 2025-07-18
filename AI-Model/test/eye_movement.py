import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
mp_drawing = mp.solutions.drawing_utils

# Webcam
cap = cv2.VideoCapture(1)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)

    r_gaze_direction = "No Face"
    l_gaze_direction = "No Face"

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # Get landmark coords (normalized to pixel + normalized x)
            def get_landmark_point(id):
                lm = face_landmarks.landmark[id]
                return int(lm.x * w), int(lm.y * h), lm.x

            def up_down(o_cor,i_cor, iris_center,iris_cor,t1,t2,lid):
            # Key points
                o_cor = get_landmark_point(o_cor)
                i_cor = get_landmark_point(i_cor)
                iris_center = get_landmark_point(iris_center)
                iris_cor = get_landmark_point(iris_cor)
                t1 = get_landmark_point(t1)
                t2 = get_landmark_point(t2)
                lid = get_landmark_point(lid)

                # Lines
                cv2.circle(frame, lid[:2], 4, (0, 255, 0), -1)  # Point 159
                cv2.line(frame, t1[:2], t2[:2], (0, 0, 255), 2)
                cv2.line(frame, (t1[0], (t1[1] + t2[1]) // 2), (t2[0], (t1[1] + t2[1]) // 2), (0, 165, 255), 1)

                # Iris radius & mask
                radius = int(np.linalg.norm(np.array(iris_center) - np.array(iris_cor)))
                iris_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.circle(iris_mask, iris_center[:2], radius, 255, -1)

                # Horizontal split line
                y_line = int((o_cor[1] + i_cor[1]) / 2)
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
                    direction = "Up"
                elif ratio < 0.45:
                    direction = "Down"
                else:
                    direction = "Center"

                # Additional check with 159
                y_mid_iris = int((t1[1] + t2[1]) / 2)
                if lid[1] >= y_mid_iris:
                    direction = "Down"

                # Debug draw
                cv2.circle(frame, iris_center[:2], radius, (255, 0, 0), 2)
                cv2.putText(frame, f"Above: {above_area}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
                cv2.putText(frame, f"Below: {below_area}", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                cv2.putText(frame, f"Gaze: {direction}", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)

                return direction


            def direction(o_cor, i_cor, iris_right, iris_left):

                gaze_direction = "No Face"
                x_o_cor, y_o_cor, norm_o_cor = get_landmark_point(o_cor)  # Outer corner
                x_i_cor, y_i_cor, norm_i_cor = get_landmark_point(i_cor)  # Inner corner
                x_iris_right, y_iris_right, norm_iris_right = get_landmark_point(iris_right)  # Iris right
                x_iris_left, y_iris_left, norm_iris_left = get_landmark_point(iris_left)  # Iris left
    

                # Compute eye width and iris center
                eye_width = norm_o_cor - norm_i_cor
                iris_center = (norm_iris_right + norm_iris_left) / 2
                iris_ratio = (iris_center - norm_i_cor) / eye_width

                # Gaze estimation
                if (o_cor == 163):
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
                
                    

                # Draw eye corner vertical lines
                cv2.line(frame, (x_o_cor, 0), (x_o_cor, h), (0, 255, 0), 1)
                cv2.line(frame, (x_i_cor, 0), (x_i_cor, h), (0, 0, 255), 1)


                # Draw iris points
                cv2.circle(frame, (x_iris_right, y_iris_right), 3, (255, 255, 0), -1)
                cv2.circle(frame, (x_iris_left, y_iris_left), 3, (255, 255, 0), -1)


                # Optional: Draw bounding box for eye
                cv2.rectangle(frame, (x_i_cor, y_i_cor - 10), (x_o_cor, y_i_cor + 10), (255, 0, 0), 1)

                if gaze_direction == "Center":
                    if(o_cor == 163):
                        gaze_direction = up_down(33, 133, 468, 469, 161, 173, 159)
                    else:
                        gaze_direction = up_down(263, 362, 473, 476, 388, 398, 386)
                
                return gaze_direction


            r_gaze_direction = direction(163, 157, 471, 469)
            l_gaze_direction = direction(390, 384, 474, 476)

            # Show gaze direction and iris ratio
            cv2.putText(frame, f"Right Eye : {r_gaze_direction}", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
            print(f"Right Eye Gaze Direction: {r_gaze_direction}")
            cv2.putText(frame, f"Left  Eye : {l_gaze_direction}", (30, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
            print(f"Left Eye Gaze Direction: {l_gaze_direction}")

    cv2.imshow("Gaze Tracking", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
