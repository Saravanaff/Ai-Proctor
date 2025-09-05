import socketio
import time
from functionality.mobile_detect import mobile_detect

sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=10,
    reconnection_delay=2,  # seconds
    reconnection_delay_max=10
)

@sio.event
def connect():
    print("[Mobile service] Connected to the server")
    sio.emit("register-python", {"service": "thirdeye_detect"})

mobile_detect(sio)

@sio.event
def disconnect():
    print("[Mobile service] Disconnected from the server")

while not sio.connected:
    try:
        print("[Mobile service] Trying to connect...")
        sio.connect("http://localhost:3001/")
    except Exception as e:
        print(f"[Mobile service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Mobile service] disconnecting...")
    sio.disconnect()