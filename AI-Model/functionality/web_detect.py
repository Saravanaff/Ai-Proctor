import time
import cv2
from core import constants, yolo_detect,image_utils

def web_detect(sio):
    @sio.on("webDetect")
    def handle_web_detect(data):
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        img_array = image_utils.decode_image(buffer)
        rgb_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)

        now = time.time()

        if not constants.processing_yolo and (now - constants.last_yolo_process > 0.2):
            constants.detected_objects = yolo_detect.detect_person_and_objects(rgb_img)
            constants.last_yolo_process = now
        
        
        if sio.connected:
            sio.emit("webDetectRes", {
                "userId": userId,
                "examId": examId,
                "data": constants.detected_objects,
                "code": 0
            })

        