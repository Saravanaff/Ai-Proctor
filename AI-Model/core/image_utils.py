import numpy as np
import cv2

def decode_image(buffer: bytes) -> np.ndarray:
    np_data = np.frombuffer(buffer, dtype=np.uint8)
    image = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
    return image
