import socketio
import time

# Laptop
from handlers.connect_handlers import register_events
from handlers.process_frame import setup_process_frame_handler
from handlers.save_face_data import setup_save_face_data_handler
from handlers.auth_face import setup_auth_face_handler
from handlers.drag_camera import setup_drag_camera_handler

# Third Eye
from handlers.third_eye.thirdeye_cam import setup_thirdeye_cam_handler

# Create client with reconnection logic
sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=10,
    reconnection_delay=2,  # seconds
    reconnection_delay_max=10
)

# Event handlers
@sio.event
def connect():
    print("[SocketIO] ✅ Connected to server")

@sio.event
def disconnect():
    print("[SocketIO] ❌ Disconnected from server")

@sio.event
def connect_error(data):
    print(f"[SocketIO] ⚠️ Connection failed: {data}")

# Register all handlers
register_events(sio)
setup_process_frame_handler(sio)
setup_save_face_data_handler(sio)
setup_auth_face_handler(sio)
setup_drag_camera_handler(sio)
setup_thirdeye_cam_handler(sio)

# Connect with retry loop (optional safety)
while not sio.connected:
    try:
        print("[SocketIO] Trying to connect...")
        sio.connect("http://localhost:3001/")
    except Exception as e:
        print(f"[SocketIO] Connection error: {e}")
        time.sleep(2)

# Keep the client alive

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("[SocketIO] Gracefully disconnecting...")
    sio.disconnect()
