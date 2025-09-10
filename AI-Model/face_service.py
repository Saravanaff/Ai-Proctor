import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import socketio
import time
import urllib3

from functionality.process_frame import setup_process_frame_handler, cleanup_frame_functionality
from functionality.face_auth import face_auth
from threading import Thread
from core import constants

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

setup_process_frame_handler(sio)
face_auth(sio)


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
    constants.store_queue.put(None)  
    constants.auth_queue.put(None)
    cleanup_frame_functionality()
    sio.disconnect()