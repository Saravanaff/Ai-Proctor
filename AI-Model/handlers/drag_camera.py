import time
import cv2
from core import constants, image_utils, auth, head_pose, yolo_detect

def setup_drag_camera_handler(sio):
    @sio.on("drag_camera")
    def handle_drag_camera(data):
        buffer = data["buffer"]
        name = data["name"]
        img = image_utils.decode_image(buffer)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        now = time.time()

        if now - constants.last_auth_process > constants.AUTH_INTERVAL:
            with constants.auth_lock:
                if now - constants.last_auth_process > constants.AUTH_INTERVAL:
                    constants.auth_status = auth.authenticate_face(rgb_img, name)
                    constants.last_auth_process = now

        if now - constants.last_head_process > constants.HEAD_INTERVAL:
            with constants.head_lock:
                if now - constants.last_head_process > constants.HEAD_INTERVAL:
                    constants.head_position, constants.eyes = head_pose.detect_head_direction(rgb_img)
                    constants.last_head_process = now

        if not constants.processing_yolo and (now - constants.last_yolo_process > 0.5):
            constants.person_count, constants.detected_objects = yolo_detect.detect_person_and_objects(rgb_img)
            constants.last_yolo_process = now

        sio.emit("drag_camera_result", {
            "no_of_person": constants.person_count,
            "auth_face": constants.auth_status,
            "head_position": constants.head_position,
            "eyes": constants.eyes,
            "object_detected": constants.detected_objects,
        })
