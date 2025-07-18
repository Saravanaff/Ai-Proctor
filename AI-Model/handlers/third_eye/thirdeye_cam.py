import time
import cv2
from core import constants, image_utils, yolo_detect

def setup_thirdeye_cam_handler(sio2):
    @sio2.on("thirdeye_cam")
    def handle_thirdeye_cam(data):
        print("Received data from thirdeye_cam:", data)
        buffer = data
        img = image_utils.decode_image(buffer)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        now = time.time()
        if not constants.processing_yolo and (now - constants.last_yolo_process > 0.5):
            constants.third_eye_objects = yolo_detect.thirdeye_object_detect(rgb_img)
            constants.last_yolo_process = now

        sio2.emit("thirdeye_cam_result", constants.third_eye_objects)