import numpy as np
import cv2
import face_recognition
import time
from core import constants,image_utils,head_pose,store_face
import gc

stage_arr=["Forward","Up","Right","Down","Left"]
is_store=False

last_processed_time = 0
frame_interval = 0.1
frame_count=0
def setup_process_frame_handler(sio):
    @sio.on("process-frame")
    def handle_frame(data):
        global last_processed_time
        global is_store
        global frame_count
        frame_count+=1
        if frame_count%2!=0:
            return
        if time.time() - last_processed_time < frame_interval:
            return

        try:
            last_processed_time = time.time()

            userId=data["user_id"]
            buffer = data["buffer"]
            metadata = data["metadata"]
            width, height = int(metadata["width"]), int(metadata["height"])
            # print("width:", width, "height:", height)

            image_array = np.frombuffer(buffer, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if img is None:
                print("⚠ Failed to decode image")
                return
            
            if is_store==False:
                cv2.imwrite("test_image.jpg",img)
                print("Saved test data")
                is_store=True

            small_img = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
            rgb_small = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)
            print("rgb_small shape: " ,rgb_small.shape," dtype : ",rgb_small.dtype)
            faces_fr = face_recognition.face_locations(rgb_small)

            if last_processed_time - constants.last_head_process > constants.HEAD_INTERVAL:
                with constants.head_lock:
                    if last_processed_time - constants.last_head_process > constants.HEAD_INTERVAL:
                        constants.head_position, constants.eyes = head_pose.detect_head_direction(rgb_small)
                        constants.last_head_process = last_processed_time

            if stage_arr[constants.stage] == constants.head_position: 
                if(len(faces_fr)>0):
                    constants.counter[constants.stage]+=1
            else:
                constants.counter[constants.stage]=0

            if constants.counter[constants.stage]%10==0 and constants.counter[constants.stage]!=0:
                if constants.head_position == stage_arr[constants.stage] and len(faces_fr) >0 :
                    print("store called")
                    if(store_face.store_data(rgb_small,faces_fr,constants.stage,userId)):
                        constants.success[constants.stage]=True
                    else: 
                        print("Failure")
                    print("store exit")

            result_data = {
                "userId":userId,
                "face_found": len(faces_fr) > 0,
                "head_position": constants.head_position,
                "stage":constants.stage,
                "counter":constants.counter[constants.stage],
                "success":constants.success[constants.stage],

            }
            if constants.success[constants.stage]:
                constants.stage+=1

            sio.emit("result", result_data)

            del img, small_img, rgb_small
            gc.collect()

        except Exception as e:
            print("🚨 Error:", e)