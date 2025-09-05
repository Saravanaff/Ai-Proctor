import socketio
import time

from functionality.face_store import face_store
from functionality.face_auth import face_auth

sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=10,
    reconnection_delay=2,  # seconds
    reconnection_delay_max=10
)

@sio.event
def connect():
    print("[Face service] Connected to the server")
    sio.emit("register-python", {"service": "face_service"})

face_store(sio)
face_auth(sio)


@sio.event
def disconnect():
    print("[Face service] Disconnected from the server")

while not sio.connected:
    try:
        print("[Face service] Trying to connect...")
        sio.connect("http://localhost:3001/")
    except Exception as e:
        print(f"[Face service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Face service] disconnecting...")
    sio.disconnect()