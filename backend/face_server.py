import socketio
import eventlet
import eventlet.wsgi
from flask import Flask
import cv2
import numpy as np

sio = socketio.Server(cors_allowed_origins="*")
app = Flask(__name__)
app = socketio.WSGIApp(sio, app)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def is_face_inside_circle(face_rect, circle):
    x, y, w, h = face_rect
    face_center_x = x + w / 2
    face_center_y = y + h / 2

    dx = face_center_x - circle['x']
    dy = face_center_y - circle['y']
    distance = (dx**2 + dy**2) ** 0.5

    return distance <= circle['radius']

@sio.event
def connect(sid, environ):
    print("Client connected:", sid)

@sio.event
def frame(sid, data):
    try:
        buffer = data['buffer']
        metadata = data.get('metadata', {})
        circle = metadata.get('circle', None)

        if not circle:
            print("No circle metadata received.")
            return

        nparr = np.frombuffer(buffer, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        detected = False
        for face in faces:
            if is_face_inside_circle(face, circle):
                detected = True
                break

        sio.emit("face-detection", {"detected": detected}, room=sid)

        for (x, y, w, h) in faces:
            color = (0, 255, 0) if is_face_inside_circle((x, y, w, h), circle) else (0, 0, 255)
            cv2.rectangle(img, (x, y), (x+w, y+h), color, 2)

        cv2.circle(img, (int(circle["x"]), int(circle["y"])), int(circle["radius"]), (255, 255, 0), 2)
        cv2.imshow('Face Detection', img)
        cv2.waitKey(1)

    except Exception as e:
        print("Processing error:", e)
        sio.emit("face-detection", {"detected": False}, room=sid)

@sio.event
def disconnect(sid):
    print("Client disconnected:", sid)

if __name__ == "__main__":
    print("Starting server on http://localhost:8000")
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 8000)), app)
