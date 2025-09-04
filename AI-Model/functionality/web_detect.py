from ultralytics import YOLO
import numpy as np
import cv2

yolo_model = YOLO("final.pt")

def web_detect(sio):
    @sio.on("webDetect")
    def handle_web_detect(data):
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        img_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        result = yolo_model.predict(rgb_img, verbose=False)[0]

        detected_objects = {"Person": 0, "Mobile-phone": 0, "Laptop": 0}

        for box in result.boxes:
            label = yolo_model.names[int(box.cls[0])]
            if label in detected_objects:
                detected_objects[label] += 1

        sio.emit ("webDetectRes", {
            "userId": userId,
            "examId": examId,
            "data" : detected_objects,
            "code": 0
        })
        del img, rgb_img, result