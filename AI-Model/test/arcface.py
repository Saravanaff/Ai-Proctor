from insightface.app import FaceAnalysis
import cv2
import numpy as np

# 1. Initialize FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=(256, 256))  # small det_size is fine for single close face

# 2. Load reference image (person A)
img1 = cv2.imread("/home/cyberhunter/Ai-Proctor/AI-Model/debug_faces/ghfhdfhdfh_angle3.jpg")
faces1 = app.get(img1)   # no manual cv2.resize
embeddingA = faces1[0].embedding.tolist()
print("Embedding A length:", len(embeddingA))

# 3. Load test image (person B)
img2 = cv2.imread("/home/cyberhunter/Ai-Proctor/AI-Model/debug_faces/Krishna_angle1.jpg")
faces2 = app.get(img2)   # no manual cv2.resize
embeddingB = faces2[0].embedding.tolist()
print("Embedding B length:", len(embeddingB))

# 4. Compare embeddings (cosine similarity)
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

score = cosine_similarity(embeddingA, embeddingB)
print("Cosine similarity:", score)

# Threshold tuning (~0.6–0.8 works well)
if score > 0.65:
    print("Same person ✅")
else:
    print("Different person ❌")
