import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import socketio
import time
import urllib3
from threading import Thread

from functionality.face_auth import face_auth,handle_face_auth

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=10,
    reconnection_delay=2,  # seconds
    reconnection_delay_max=10,
    ssl_verify=False,
    engineio_logger=False,
    logger=False
)

@sio.event
def connect():
    print("[Face service] Connected to the server")
    sio.emit("register-python", {"service": "face_service"})


face_auth(sio)
Thread(target=handle_face_auth, args=(sio,), daemon=True).start()


@sio.event
def disconnect():
    print("[Face service] Disconnected from the server")

while not sio.connected:
    try:
        print("[Face service] Trying to connect...")
        sio.connect("https://172.16.105.211:3001/", transports=['websocket'])
    except Exception as e:
        print(f"[Face service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Face service] disconnecting...")
    sio.disconnect()