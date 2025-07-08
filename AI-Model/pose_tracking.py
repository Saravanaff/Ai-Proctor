import cv2
import mediapipe as mp
import time

cap = cv2.VideoCapture('test_movie.mp4')
cTime=0
pTime=0
while True:
    _,img=cap.read()

    k=cv2.waitKey(1)
    cTime=time.time()
    fps = 1/(cTime-pTime)
    pTime=cTime
    cv2.putText(img,str(int(fps)),(70,50), cv2.FONT_HERSHEY_PLAIN, 3, (255,0,0),3)

    cv2.imshow("Image", img)

    if k==ord('q'):
        break