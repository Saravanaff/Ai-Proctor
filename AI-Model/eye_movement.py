import cv2
import mediapipe as mp

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
mp_drawing = mp.solutions.drawing_utils

# Webcam
cap = cv2.VideoCapture(0)

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

            # Right eye landmarks
            x_163, y_163, norm_163 = get_landmark_point(163)  # Outer corner
            x_157, y_157, norm_157 = get_landmark_point(157)  # Inner corner
            x_471, y_471, norm_471 = get_landmark_point(471)  # Iris right
            x_469, y_469, norm_469 = get_landmark_point(469)  # Iris left

            #Left eye landmarks
            x_390, y_390, norm_390 = get_landmark_point(390) # Outer corner
            x_384, y_384, norm_384 = get_landmark_point(384) # Inner corner
            x_474, y_474, norm_474 = get_landmark_point(474) # Iris left
            x_476, y_476, norm_476 = get_landmark_point(476) # Iris right


            # Compute eye width and iris center
            r_eye_width = norm_163 - norm_157
            r_iris_center = (norm_471 + norm_469) / 2
            r_iris_ratio = (r_iris_center - norm_157) / r_eye_width

            l_eye_width = norm_390 - norm_384
            l_iris_center = (norm_474 + norm_476) / 2
            l_iris_ratio = (l_iris_center - norm_384) / l_eye_width




            # Gaze estimation
            if r_iris_ratio < 0.35:
                r_gaze_direction = "Left"
            elif r_iris_ratio > 0.65:
                r_gaze_direction = "Right"
            else:
                r_gaze_direction = "Center"

            if l_iris_ratio < 0.35:
                l_gaze_direction = "Right"
            elif l_iris_ratio > 0.65:
                l_gaze_direction = "Left"
            else:
                l_gaze_direction = "Center"
            

            # Draw eye corner vertical lines
            cv2.line(frame, (x_163, 0), (x_163, h), (0, 255, 0), 1)
            cv2.line(frame, (x_157, 0), (x_157, h), (0, 0, 255), 1)
            cv2.line(frame, (x_390, 0), (x_390, h), (0, 255, 0), 1)
            cv2.line(frame, (x_384, 0), (x_384, h), (0, 0, 255), 1)

            # Draw iris points
            cv2.circle(frame, (x_471, y_471), 3, (255, 255, 0), -1)
            cv2.circle(frame, (x_469, y_469), 3, (255, 255, 0), -1)
            cv2.circle(frame, (x_474, y_474), 3, (255, 255, 0), -1)
            cv2.circle(frame, (x_476, y_476), 3, (255, 255, 0), -1)

            # Optional: Draw bounding box for eye
            cv2.rectangle(frame, (x_157, y_157 - 10), (x_163, y_157 + 10), (255, 0, 0), 1)
            cv2.rectangle(frame, (x_384, y_384 - 10), (x_390, y_384 + 10), (255, 0, 0), 1)

            # Show gaze direction and iris ratio
            cv2.putText(frame, f"Right Eye : {r_gaze_direction}", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
            cv2.putText(frame, f"Left  Eye : {l_gaze_direction}", (30, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
 
    cv2.imshow("Gaze Tracking", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
