import os 
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import socketio
import time
import urllib3
from functionality.eye_position import eye_functionality

# Disable SSL warnings
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
    print("[Eye service] Connected to the server")
    sio.emit("register-python", {"service": "eye_position"})

@sio.event
def disconnect():
    print("[Eye service] Disconnected from the server")

eye_functionality(sio)

while not sio.connected:
    try:
        print("[Eye service] Trying to connect...")
        sio.connect("https://localhost:3001/", transports=['websocket'])
    except Exception as e:
        print(f"[Eye service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Eye service] disconnecting...")
    sio.disconnect()