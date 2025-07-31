import os
import json
import numpy as np
import cv2
import gc

from core import store_face
    
def setup_save_face_data_handler(sio):
    @sio.on("save-face-data")
    def save_face_data(data):

        print("📝 Saving face data...")
        blob = data["buffer"]
        name = data["name"]
        angle = data["angle"] #1 front , 2 right, 3 left;
    
        image_array = np.frombuffer(blob, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
        if img is None:
            print("Could not decode image")
            sio.emit("face_data_saved", {"status": False, "reason": "Image decode failed"})
            return
        

                
        h, w = img.shape[:2]
        crop_w, crop_h = 640, 640
    
        if h >= crop_h and w >= crop_w:
            x_start = (w - crop_w) // 2
            y_start = (h - crop_h) // 2
            img = img[y_start:y_start+crop_h, x_start:x_start+crop_w]
        else:
            print(f"Image too small to crop: got ({w}x{h})")
            sio.emit("face_data_saved", {"status": False, "reason": "Image too small for cropping"})
            return
                
        # 👇 Save the decoded image for debugging
        debug_dir = "debug_faces"
        os.makedirs(debug_dir, exist_ok=True)
        image_path = os.path.join(debug_dir, f"{name}_angle{angle}.jpg")
        cv2.imwrite(image_path, img)
        print(f"Saved image to {image_path}")
    
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        print("Image dtype:", rgb_img.dtype, "Shape:", rgb_img.shape)
    
        print("Processing")
        result = store_face.store_data(rgb_img,angle,name)
        print("Processed")

        sio.emit("face_data_saved", result)
        del img, rgb_img, result
        gc.collect()