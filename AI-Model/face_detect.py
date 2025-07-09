import socketio
import numpy as np
import cv2
import face_recognition
import time

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Node.js socket server")
    sio.emit("register-python")  # Register this socket as the Python client

@sio.event
def disconnect():
    print("🔌 Disconnected from server")

@sio.on("process-frame")
def handle_frame(data):
    try:
        print("📥 Frame received from Node.js")

        buffer = data["buffer"]
        metadata = data["metadata"]
        width = int(metadata["width"])
        height = int(metadata["height"])

        # Convert buffer to OpenCV image
        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Failed to decode image")
            return

        # Haar Cascade face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces_haar = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5
        )

        # face_recognition detection
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces_fr = face_recognition.face_locations(rgb_img)

        # Prepare result to send back
        result_data = {
            "haar_faces": [list(map(int, face)) for face in faces_haar],
            "fr_faces": [list(map(int, [top, right, bottom, left])) for top, right, bottom, left in faces_fr],
            "face_found": len(faces_haar) > 0 or len(faces_fr) > 0,
        }

        # Send result back to Node.js
        sio.emit("result", result_data)

        # Show the frame with rectangles
        for (x, y, w, h) in faces_haar:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        for top, right, bottom, left in faces_fr:
            cv2.rectangle(img, (left, top), (right, bottom), (255, 0, 0), 2)

        cv2.imshow("Detection", img)
        cv2.waitKey(1)

    except Exception as e:
        print("🚨 Error:", e)

# Connect to the Node.js server
sio.connect("http://localhost:3001")

# Keep the program running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()
    cv2.destroyAllWindows()
