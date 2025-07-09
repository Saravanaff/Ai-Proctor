import socketio
import numpy as np
import cv2
import face_recognition

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Node.js socket server")
    sio.emit("register-python")

@sio.event
def disconnect():
    print("🔌 Disconnected from server")

@sio.on("process-frame")
def handle_frame(data):
    try:
        buffer = data["buffer"]
        metadata = data["metadata"]
        width = int(metadata["width"])
        height = int(metadata["height"])

        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Failed to decode image")
            return

        # Option 1: Haar Cascade
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces_haar = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        # Option 2: face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces_fr = face_recognition.face_locations(rgb_img)

        # Prepare result
        result_data = {
            "haar_faces": [list(map(int, face)) for face in faces_haar],  # convert to list for JSON
            "fr_faces": [list(map(int, [top, right, bottom, left])) for top, right, bottom, left in faces_fr],
            "face_found": len(faces_haar) > 0 or len(faces_fr) > 0,
        }
        print(result_data)
        sio.emit("result", result_data)

        for (x, y, w, h) in faces_haar:
            cv2import socketio
import numpy as np
import cv2
import face_recognition

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Node.js socket server")
    sio.emit("register-python")

@sio.event
def disconnect():
    print("🔌 Disconnected from server")

@sio.on("process-frame")
def handle_frame(data):
    try:
        buffer = data["buffer"]
        metadata = data["metadata"]
        width = int(metadata["width"])
        height = int(metadata["height"])

        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Failed to decode image")
            return

        # Option 1: Haar Cascade
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces_haar = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        # Option 2: face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces_fr = face_recognition.face_locations(rgb_img)

        # Prepare result
        result_data = {
            "haar_faces": [list(map(int, face)) for face in faces_haar],  # convert to list for JSON
            "fr_faces": [list(map(int, [top, right, bottom, left])) for top, right, bottom, left in faces_fr],
            "face_found": len(faces_haar) > 0 or len(faces_fr) > 0,
        }
        print(result_data)
        sio.emit("result", result_data)

        for (x, y, w, h) in faces_haar:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

        for top, right, bottom, left in faces_fr:
            cv2.rectangle(img, (left, top), (right, bottom), (255, 0, 0), 2)

        cv2.imshow("Detection", img)
        cv2.waitKey(1)

    except Exception as e:
        print("🚨 Error:", e)

sio.connect("http://localhost:3001")
try:
    import time
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()
    cv2.destroyAllWindows()
.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

        for top, right, bottom, left in faces_fr:
            cv2.rectangle(img, (left, top), (right, bottom), (255, 0, 0), 2)

        cv2.imshow("Detection", img)
        cv2.waitKey(1)

    except Exception as e:
        print("🚨 Error:", e)

sio.connect("http://localhost:3001")
try:
    import time
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()
    cv2.destroyAllWindows()
