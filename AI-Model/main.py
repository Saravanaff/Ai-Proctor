import socketio
import time
#Laptop
from handlers.connect_handlers import register_events
from handlers.process_frame import setup_process_frame_handler
from handlers.save_face_data import setup_save_face_data_handler
from handlers.auth_face import setup_auth_face_handler
from handlers.drag_camera import setup_drag_camera_handler

#Third Eye
from handlers.third_eye.thirdeye_cam import setup_thirdeye_cam_handler

sio = socketio.Client()

# Laptop
register_events(sio)
setup_process_frame_handler(sio)
setup_save_face_data_handler(sio)
setup_auth_face_handler(sio)
setup_drag_camera_handler(sio)

#Third Eye
setup_thirdeye_cam_handler(sio)

sio.connect("http://localhost:3001")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()