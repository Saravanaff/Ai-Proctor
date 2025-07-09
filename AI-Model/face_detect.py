import socketio
import numpy as np
import cv2
import face_recognition
import time
import gc

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Node.js socket server")
    sio.emit("register-python")

@sio.event
def disconnect():
    print("🔌 Disconnected from server")

last_processed_time = 0
frame_interval = 0.5

@sio.on("process-frame")
def handle_frame(data):
    global last_processed_time

    if time.time() - last_processed_time < frame_interval:
        return

    try:
        last_processed_time = time.time()

        buffer = data["buffer"]
        metadata = data["metadata"]
        width, height = int(metadata["width"]), int(metadata["height"])
        print("width:", width, "height:", height)

        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Failed to decode image")
            return

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces_haar = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5
        )

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces_fr = face_recognition.face_locations(rgb_img)

        result_data = {
            "fr_faces": [list(map(int, face)) for face in fr_faces_scaled],
            "face_found": len(fr_faces_scaled) > 0,
        }

        sio.emit("result", result_data)

        for (x, y, w, h) in faces_haar:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        for top, right, bottom, left in faces_fr:
            cv2.rectangle(img, (left, top), (right, bottom), (255, 0, 0), 2)

        cv2.imshow("Detection", img)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            sio.disconnect()
            cv2.destroyAllWindows()

        del img, small_img, rgb_small
        gc.collect()

    except Exception as e:
        print("🚨 Error:", e)

sio.connect("http://localhost:3001")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()
    cv2.destroyAllWindows()
