import time
import cv2
from core import constants, third_eye,image_utils

def mobile_detect(sio):
    @sio.on("mobileDetect")
    def handle_mobile_detect(data):
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        img_array = image_utils.decode_image(buffer)
        rgb_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)

        now = time.time()

        if not constants.processing_cam and (now - constants.last_cam_process > 0.2):
            constants.third_eye_objects = third_eye.third_eye_detect(rgb_img)
            constants.last_cam_process = now

        print(constants.third_eye_objects)
        
        if sio.connected:
            sio.emit("mobileDetectRes", {
                "userId": userId,
                "examId": examId,
                "data": constants.third_eye_objects,
                "code": 0
            })

        