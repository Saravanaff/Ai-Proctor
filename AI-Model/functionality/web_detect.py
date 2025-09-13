# import time
import cv2
from core import image_utils, obj_detect
import onnxruntime as ort

sess_options = ort.SessionOptions()

# Threading: more parallelism (higher speed, more CPU)
sess_options.intra_op_num_threads = 3     # threads inside one operator
sess_options.inter_op_num_threads = 1      # operators across graph

# Allow parallel graph execution
sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL

# # Disable spinning → saves idle CPU
# sess_options.add_session_config_entry("session.intra_op.allow_spinning", "0")
# sess_options.add_session_config_entry("session.inter_op.allow_spinning", "0")

# Create session
session = ort.InferenceSession("yolo11n.onnx", sess_options, providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name


def web_detect(sio):
    @sio.on("webDetect")
    def handle_web_detect(data):
        buffer = data["buffer"]
        userId = data["user_id"]
        examId = data["exam_id"]
        img_array = image_utils.decode_image(buffer)
        rgb_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)

        detected_objects = obj_detect.detect_objects(rgb_img,session,input_name)
        
        print(detected_objects)
        if sio.connected:
            sio.emit("webDetectRes", {
                "userId": userId,
                "examId": examId,
                "timestamp": data["timestamp"],
                "data": detected_objects,
                "code": 0
            })
