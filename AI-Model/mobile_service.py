import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import socketio
import time
import urllib3
from functionality.mobile_detect import mobile_detect, handle_mobile_detect, cleanup_mobile_functionality
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
    print("[Mobile service] Connected to the server")
    sio.emit("register-python", {"service": "thirdeye_detect"})

mobile_detect(sio)

Thread(target=handle_mobile_detect, args=(sio,), daemon=True).start()

@sio.event
def disconnect():
    print("[Mobile service] Disconnected from the server")

while not sio.connected:
    try:
        print("[Mobile service] Trying to connect...")
        sio.connect("https://localhost:3001/", transports=['websocket'])
    except Exception as e:
        print(f"[Mobile service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Mobile service] disconnecting...")
    constants.mobile_queue.put(None)
    cleanup_mobile_functionality
    sio.disconnect()