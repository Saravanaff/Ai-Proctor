import numpy as np
import cv2
import onnxruntime as ort
from core import head_pose,store_face

stage_arr=["Forward","Right","Left"]

sess_options = ort.SessionOptions()
sess_options.intra_op_num_threads = 3  
sess_options.inter_op_num_threads = 1     
sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL
onnx_path = "MobileFaceNet.onnx"

session = ort.InferenceSession(onnx_path,sess_options, providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name

def preprocessing(image):
    img = cv2.resize(image, (112, 112))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 128.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, 0)
    return img


def setup_process_frame_handler(sio):
    @sio.on("process-frame")
    def handle_frame(data):
        try:
            print("arrived")
            userId=data["user_id"]
            buffer = data["buffer"]
            metadata = data["metadata"]
            width, height = int(metadata["width"]), int(metadata["height"])
            counter = data["counter"]
            stage = data["stage"]
            success = False

            image_array = np.frombuffer(buffer, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            if img is None:
                print("⚠ Failed to decode image")
                return
            
            img = preprocessing(img)
            embedding  = session.run(None, {input_name: img})
            

            head_position = head_pose.detect_head_direction(rgb_img)

            if stage_arr[stage] == head_position: 
                if(len(embedding)>0):
                    counter+=1
            else:
                counter = 0

            if counter%2==0 and counter!=0:
                if head_position == stage_arr[stage] and len(embedding) >0 :
                    print("store called")
                    if len(embedding)>1:
                        print("Multiple faces detected, skipping storage.")
                        result_data = {
                            "userId":userId,
                            "face_found": len(embedding) > 0,
                            "head_position": head_position,
                            "stage":stage,
                            "counter":counter,
                            "success":success,
                        }
                        if sio.connected:
                            sio.emit("result", result_data)
                        return
                    emb = embedding[0].squeeze()
                    emb = emb.tolist()
                    if(store_face.store_data(emb,stage,userId)):
                        success=True
                    else: 
                        print("Failure")
                    print("store exit")

            result_data = {
                "userId":userId,
                "face_found": len(embedding) > 0,
                "head_position": head_position,
                "stage":stage,
                "counter":counter,
                "success":success,

            }
            print(result_data)

            sio.emit("result", result_data)

        except Exception as e:
            print("🚨 Error:", e)