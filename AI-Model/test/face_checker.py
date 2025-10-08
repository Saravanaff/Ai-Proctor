import cv2
import face_recognition
import numpy as np

img = cv2.imread("../debug_faces/Krishna_angle1.jpg")
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

print("Image shape:", rgb.shape)


