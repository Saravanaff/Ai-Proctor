import numpy as np
import cv2
import face_recognition
import time
import gc

last_processed_time = 0
frame_interval = 0.5
frame_count=0
def setup_process_frame_handler(sio):
    @sio.on("process-frame")
    def handle_frame(data):
        global last_processed_time
        global frame_count
        frame_count+=1
        if frame_count%10!=0:
            return
        if time.time() - last_processed_time < frame_interval:
            return

        try:
            last_processed_time = time.time()

            buffer = data["buffer"]
            metadata = data["metadata"]
            width, height = int(metadata["width"]), int(metadata["height"])
            print("width:", width, "height:", height)

            image_array = np.frombuffer(buffer, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if img is None:
                print("⚠️ Failed to decode image")
                return

            small_img = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
            rgb_small = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)

            faces_fr = face_recognition.face_locations(rgb_small)

            fr_faces_scaled = [
                [top * 2, right * 2, bottom * 2, left * 2]
                for top, right, bottom, left in faces_fr
            ]

            result_data = {
                "fr_faces": [list(map(int, face)) for face in fr_faces_scaled],
                "face_found": len(fr_faces_scaled) > 0,
            }

            sio.emit("result", result_data)

            del img, small_img, rgb_small
            gc.collect()

        except Exception as e:
            print("🚨 Error:", e)
