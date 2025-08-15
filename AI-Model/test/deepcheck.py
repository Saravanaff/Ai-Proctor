from deepface import DeepFace
import cv2

img1_path ="../storage/1_stage0.jpg"
img2_path ="../debug_faces/Sriram_angle1.jpg"

img1 = cv2.imread(img1_path)
small_img = cv2.resize(img1, (0, 0), fx=0.5, fy=0.5)
rgb_small = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)

img2 = cv2.imread(img2_path)
small = cv2.resize(img2, (0, 0), fx=0.5, fy=0.5)
rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

res = DeepFace.verify(img1,img2,model_name="ArcFace")

print(res)
