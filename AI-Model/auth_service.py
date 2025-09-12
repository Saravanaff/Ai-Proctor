import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import socketio
import time
import urllib3

from functionality.face_auth import face_auth

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
    print("[Auth service] Connected to the server")
    sio.emit("register-python", {"service": "auth_service"})


face_auth(sio)


@sio.event
def disconnect():
    print("[Auth service] Disconnected from the server")

while not sio.connected:
    try:
        print("[Auth service] Trying to connect...")
        sio.connect("https://172.16.102.164:3001/", transports=['websocket'])
    except Exception as e:
        print(f"[Auth service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Auth service] disconnecting...")
    sio.disconnect()