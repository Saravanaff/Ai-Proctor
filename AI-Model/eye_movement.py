import cv2
import mediapipe as mp
import math

def colour_eye(img, r, l):
    x1 = int(r.x * w)
    y1 = int(r.y * h)
    x2 = int(l.x * w)
    y2 = int(l.y * h)
    mx = (x1 + x2) // 2
    my = (y1 + y2) // 2
    radius = int(math.sqrt((mx - x1)**2 + (my - y1)**2))
    cv2.circle(img, (mx, my), radius, (0, 0, 255), -1)  # Filled red circle

cap = cv2.VideoCapture(0)
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

while cap.isOpened():
    _, img = cap.read()
    img = cv2.flip(img, 1)
    imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = face_mesh.process(imgRGB)

    h, w, c = img.shape
    landmark_points = res.multi_face_landmarks

    if landmark_points:
        landmarks = landmark_points[0].landmark

        # Right eye iris and corners
        rr = landmarks[471]
        rl = landmarks[469]
        colour_eye(img, rr, rl)  # Right iris color fill

        # Left eye iris and corners
        lr = landmarks[474]
        ll = landmarks[476]
        colour_eye(img, lr, ll)  # Left iris color fill

        # Iris movement detection (right eye)
        right_outer = landmarks[33]
        right_inner = landmarks[133]
        right_top = landmarks[159]
        right_bottom = landmarks[145]
        right_iris = landmarks[468]

        x_outer = int(right_outer.x * w)
        x_inner = int(right_inner.x * w)
        x_iris = int(right_iris.x * w)

        y_top = int(right_top.y * h)
        y_bottom = int(right_bottom.y * h)
        y_iris = int(right_iris.y * h)

        horizontal_center = (x_outer + x_inner) // 2
        vertical_center = (y_top + y_bottom) // 2

        # Thresholds (you can tweak these)
        horiz_thresh = 5
        vert_thresh = 3

        direction = ""
        if x_iris < horizontal_center - horiz_thresh:
            direction += "Iris moved RIGHT"
        elif x_iris > horizontal_center + horiz_thresh:
            direction += "Iris moved LEFT"
        else:
            direction += "Iris Center"

        if y_iris < vertical_center - vert_thresh:
            direction += " and UP"
        elif y_iris > vertical_center + vert_thresh:
            direction += " and DOWN"
        else:
            direction += " and CENTER"

        cv2.putText(img, direction, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)

    cv2.imshow("Eye movement", img)
    k = cv2.waitKey(1)
    if k == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
