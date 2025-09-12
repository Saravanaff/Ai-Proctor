import cv2 
import numpy as np 


def preprocess(image, target_size=640):

    h,w = image.shape[:2]

    scale = min(target_size/h, target_size/w)
    new_h, new_w = int(h*scale), int(w*scale)

    resized = cv2.resize(image,(new_w,new_h))
    letterboxed = np.full((target_size,target_size,3), 114, dtype=np.uint8)

    pad_h = (target_size - new_h) // 2
    pad_w = (target_size - new_w) // 2

    letterboxed[pad_h:pad_h + new_h, pad_w:pad_w + new_w] = resized
    letterboxed = letterboxed.astype(np.float32) / 255.0

    letterboxed = np.transpose(letterboxed, (2, 0, 1))
    letterboxed = np.expand_dims(letterboxed, axis=0)

    return letterboxed, scale, (pad_w, pad_h)

def apply_nms(boxes, scores, class_ids, iou_threshold=0.45):

    if len(boxes) == 0:
        return [], [], []
    
    boxes_for_nms = []
    for box in boxes:
        x1, y1, x2, y2 = box
        boxes_for_nms.append([x1, y1, x2 - x1, y2 -y1])

    indices = cv2.dnn.NMSBoxes(boxes_for_nms, scores.tolist(), 0.0, iou_threshold)
    
    if len(indices) > 0:
        indices = indices.flatten()
        return boxes[indices], scores[indices], class_ids[indices]
    else:
        return [], [], []
    
def detect_objects(image, session, input_name):

    img_processed, scale_factor, padding = preprocess(image)

    outputs = session.run(None, {input_name: img_processed})
    preds = outputs[0][0]

    detections = {"Person": 0, "Mobile": 0, "Laptop": 0}

    bbox_coords = preds[:4, :]
    class_scores  = preds[4:, :]

    max_scores = np.max(class_scores, axis=0)  
    class_ids = np.argmax(class_scores, axis=0)

    conf_threshold = 0.25
    valid_detections = max_scores > conf_threshold

    if np.any(valid_detections):
        # Get valid detections
        valid_bbox = bbox_coords[:, valid_detections]  # (4, N)
        valid_scores = max_scores[valid_detections]
        valid_class_ids = class_ids[valid_detections]
        
        # Convert bbox from center format to corner format
        x_center, y_center, width, height = valid_bbox
        x1 = x_center - width / 2
        y1 = y_center - height / 2  
        x2 = x_center + width / 2
        y2 = y_center + height / 2
        
        # Adjust coordinates back to original image scale
        pad_w, pad_h = padding
        x1 = (x1 - pad_w) / scale_factor
        y1 = (y1 - pad_h) / scale_factor
        x2 = (x2 - pad_w) / scale_factor
        y2 = (y2 - pad_h) / scale_factor
        
        # Create arrays for NMS
        boxes_array = np.column_stack([x1, y1, x2, y2])

        final_boxes, final_scores, final_class_ids = apply_nms(
                boxes_array, valid_scores, valid_class_ids, iou_threshold=0.45
                )
        
        for i in final_class_ids:
            id = int(i)
            if id ==0 :
                detections["Person"] += 1
            elif id == 67:
                detections["Mobile"] += 1
            elif id == 63:
                detections["Laptop"] += 1

    return detections

