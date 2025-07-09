import cv2
import face_recognition
import numpy as np

cap = cv2.VideoCapture(0)




img2 = face_recognition.load_image_file('sources/ragul.png')
img2_encode = face_recognition.face_encodings(img2)[0]

known_face_encodings = [img2_encode]
known_face_names = ['Ragul']

face_locations = []
face_encodings = []
face_names = []
process_this_frame = True

while True:
    ret,frame =  cap.read()
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = small_frame[:, :, ::-1]

    face_locations = face_recognition.face_locations(rgb_small_frame)
    print (f"Found {len(face_locations)} face(s) in the frame.")
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations) 
    print (f"Found {len(face_encodings)} face encodings in the frame.")

    face_names = []
    for face_encoding in face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
        name = "Unknown"

        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]

        face_names.append(name)

    process_this_frame = not process_this_frame

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
        break

cap.release()
cv2.destroyAllWindows()
