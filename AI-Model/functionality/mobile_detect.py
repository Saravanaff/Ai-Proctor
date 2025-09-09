import time
import cv2
from core import third_eye,image_utils
counter=0

def mobile_detect(sio):
    @sio.on("mobileDetect")
    def handle_mobile_detect(data):
        global counter
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        img_array = image_utils.decode_image(buffer)
        path = f"debug_faces/{userId}_{counter}.jpg"
        counter+=1
        # cv2.imwrite(path, img_array)
        rgb_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        # print(f"shape: {rgb_img.shape}, dtype: {rgb_img.dtype}")

        now = time.time()

        # if not constants.processing_cam and (now - constants.last_cam_process > 0.2):
        third_eye_objects = third_eye.third_eye_detect(rgb_img)
            # constants.last_cam_process = now

        print(third_eye_objects)

        if sio.connected:
            sio.emit("mobileDetectRes", {
                "userId": userId,
                "examId": examId,
                "data": third_eye_objects,
                "code": 0
            })

        