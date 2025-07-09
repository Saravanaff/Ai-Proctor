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
<<<<<<< HEAD
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Failed to capture frame")
        break
=======
    ret,frame =  cap.read()
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = small_frame[:, :, ::-1]
>>>>>>> b5d6694ba1ecd400161ca5e1393797f7b397914a

    # Resize for faster detection
    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Detect face(s) in current frame
    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    for face_encoding, face_location in zip(face_encodings, face_locations):
        match = face_recognition.compare_faces([known_encoding], face_encoding)[0]

<<<<<<< HEAD
        top, right, bottom, left = [v * 2 for v in face_location]  # rescale to original size
=======
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]
>>>>>>> b5d6694ba1ecd400161ca5e1393797f7b397914a

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

<<<<<<< HEAD
    cv2.imshow("Face Identification", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
=======
    for (top, right, bottom, left), name in zip(face_locations, face_names):
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4

        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)

        cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
        font = cv2.FONT_HERSHEY_DUPLEX
        cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.5, (255, 255, 255), 1)

    cv2.imshow('Face Recognition', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
>>>>>>> b5d6694ba1ecd400161ca5e1393797f7b397914a
        break

cap.release()
cv2.destroyAllWindows()
