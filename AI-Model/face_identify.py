import cv2
import face_recognition
import numpy as np
import json
import os

# ✅ Load stored face data
face_data_path = "storage/face_data.json"
if not os.path.exists(face_data_path):
    print("❌ No face data found. Run the registration step first.")
    exit()

with open(face_data_path, "r") as f:
    data = json.load(f)
    known_encoding = np.array(data["encoding"])
    known_name = data["name"]

# 🎥 Open webcam
cap = cv2.VideoCapture(0)
print("🔍 Identifying... (press 'q' to quit)")

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Failed to capture frame")
        break

    # Resize for faster detection
    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Detect face(s) in current frame
    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    for face_encoding, face_location in zip(face_encodings, face_locations):
        match = face_recognition.compare_faces([known_encoding], face_encoding)[0]

        top, right, bottom, left = [v * 2 for v in face_location]  # rescale to original size

        if match:
            label = f"{known_name}"
            color = (0, 255, 0)
        else:
            label = "Unknown"
            color = (0, 0, 255)

        # Draw box + label
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
        cv2.putText(frame, label, (left, top - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.imshow("Face Identification", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
