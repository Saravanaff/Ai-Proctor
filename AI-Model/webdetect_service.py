import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import socketio
import time
import urllib3

from functionality.web_detect import web_detect
from core import constants
from threading import Thread

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
    print("[WebDetect service] Connected to the server")
    sio.emit("register-python", {"service": "web_detect"})

@sio.event
def disconnect():
    print("[WebDetect service] Disconnected from the server")

web_detect(sio)



while not sio.connected:
    try:
        print("[WebDetect service] Trying to connect...")
        sio.connect("https://localhost:3001/", transports=['websocket'])
    except Exception as e:
        print(f"[WebDetect service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[WebDetect service] disconnecting...")
    # constants.webdetect_queue.put(None)  
    # cleanup_web_functionality()
    sio.disconnect()