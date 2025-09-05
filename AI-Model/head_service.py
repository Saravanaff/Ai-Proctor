import socketio
import time

from functionality.head_position import head_functionality

sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=10,
    reconnection_delay=2,  # seconds
    reconnection_delay_max=10
)

@sio.event
def connect():
    print("[Head service] Connected to the server")
    sio.emit("register-python", {"service": "head_service"})

@sio.event
def disconnect():
    print("[Head service] Disconnected from the server")

head_functionality(sio)

while not sio.connected:
    try:
        print("[Head service] Trying to connect...")
        sio.connect("http://localhost:3001/")
    except Exception as e:
        print(f"[Head service] Connection error: {e}")
        time.sleep(2)
    
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[Head service] disconnecting...")
    sio.disconnect()