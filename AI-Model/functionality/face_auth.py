import json
import numpy as np
import cv2
import onnxruntime as ort


face_data_path = "storage/face_data.json"

sess_options = ort.SessionOptions()
sess_options.intra_op_num_threads = 3
sess_options.inter_op_num_threads = 1
sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL
onnx_path = "MobileFaceNet.onnx"

session = ort.InferenceSession(onnx_path, sess_options, providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name

def preprocessing(image):
    img = cv2.resize(image, (112, 112))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 128.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, 0)
    return img

def face_auth(sio):
    @sio.on("faceAuth")
    def process_face_auth(data):
        userId = data["userId"]
        examId = data["examId"]
        buffer = data["buffer"]

        # print("arrived")
        img_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if img is None:
            print("⚠ Failed to decode image")
            result = {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            }
            if sio.connected:
                sio.emit("faceAuthRes", result)
            return

        img = preprocessing(img)
        embedding = session.run(None, {input_name: img})[0]
        embedding = embedding[0].squeeze()
        embedding = embedding.tolist()
        # print("processed")

        if not embedding:
            print("[face service] No faces detected in the image.")
            result = {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            }
            if sio.connected:
                sio.emit("faceAuthRes", result)
            return
        
        with open(face_data_path, "r") as f:
            try:
                data = json.load(f)
                if isinstance(data, dict):
                    data = [data]
            except json.JSONDecodeError:
                print("[face service] Corrupted JSON data.")
                result ={
                    "userId": userId,
                    "examId": examId,
                    "code": -1,
                    "auth": False
                }
                if sio.connected:
                    sio.emit("faceAuthRes", result)
                return 
            
        target_entry = next((entry for entry in data if entry["userId"] == userId), None)
        if not target_entry:
            print(f"[face service] No entry found for userId: {userId}")
            result ={
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            }
            if sio.connected:
                sio.emit("faceAuthRes", result)
            return
    
        stored_encodings = [np.array(e) for e in target_entry["embedding"]]
    
        threshold = 0.6

        for stored_encoding in stored_encodings:
            similarity = np.dot(stored_encoding, embedding) / (np.linalg.norm(stored_encoding) * np.linalg.norm(embedding))
            print(similarity)
            if similarity > threshold:
                print("[face service] Face authenticated successfully.")
                result = {
                    "userId": userId,
                    "examId": examId,
                "code": 0,
                "auth": True
                }
                if sio.connected:
                    sio.emit("faceAuthRes", result)
                return

        result = {
            "userId": userId,
            "examId": examId,
            "code": 0,
            "auth": False
        }
        if sio.connected:
            sio.emit("faceAuthRes", result)

        

        
        
            

