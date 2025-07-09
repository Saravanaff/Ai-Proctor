import cv2
import mediapipe as mp
import numpy as np
import time

mp_face_mesh=mp.solutions.face_mesh
face_mesh=mp_face_mesh.FaceMesh(min_detection_confidence=0.5,min_tracking_confidence=0.5)

mp_drawing=mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1,circle_radius=1)

cap= cv2.VideoCapture(0)

# 263 = left_eye_left_corner
# 33 = right_eye_right_corner
# 1 = nose_tip
# 199 = below the mouth
# 61 = left mouth corner



while cap.isOpened():
    success, img=cap.read()

    start=time.time()

    img_RGB=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    res=face_mesh.process(img_RGB)

    h, w, c = img.shape

    face_3d=[]
    face_2d=[]

    if res.multi_face_landmarks:
        for facelm in res.multi_face_landmarks:
            for idx, lm in enumerate(facelm.landmark):
                if idx == 33 or idx == 263 or idx == 1 or idx ==61 or idx == 291 or idx ==199:
                    if idx == 1:
                        nose_2d = (lm.x*w,lm.y*h)
                        nose_3d = (lm.x*w,lm.y*h, lm.z*3000)
                    
                    x,y = int(lm.x * w),int(lm.y * h)

                    face_2d.append([x,y])
                    face_3d.append([x,y,lm.z])
            
            face_2d = np.array(face_2d, dtype=np.float64)
            face_3d = np.array(face_3d, dtype=np.float64)

            focal_length = 1 * w

            cam_matrix = np.array([[focal_length,0,h/2],
                                   [0,focal_length,w/2],
                                   [0,0,1]
                                   ])
            
            dis_matrix = np.zeros((4,1),dtype=np.float64)

            success, rot_vec, trans_vec = cv2.solvePnP(face_3d,face_2d,cam_matrix,dis_matrix)

            rmat, jac = cv2.Rodrigues(rot_vec)
            
            angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)

            x = angles[0]*360
            y = angles[1]*360
            z = angles[2]*360

            # Fixed direction logic without mirror flip
            if y < -10:
                text = "Looking Right"
            elif y > 10:
                text = "Looking Left"
            elif x < -10:
                text = "Looking Down"
            elif x > 10:
                text = "Looking Up"
            else:
                text = "Forward"

            nose_3d_projection, jacobian = cv2.projectPoints(nose_3d, rot_vec,trans_vec, cam_matrix, dis_matrix)

            p1 = (int(nose_2d[0]),int(nose_2d[1]))
            p2 = (int(nose_2d[0] + y* 10), int(nose_2d[1] - x* 10))

            cv2.line(img, p1,p2,(255,0,0),3)

            cv2.putText(img,text,(20,50), cv2.FONT_HERSHEY_PLAIN, 2, (0,255,0),2)
            cv2.putText(img,"x: " + str(np.round(x,2)),(500,50), cv2.FONT_HERSHEY_PLAIN, 1,(0,0,255))
            cv2.putText(img,"y: " + str(np.round(y,2)),(500,100), cv2.FONT_HERSHEY_PLAIN, 1,(0,0,255))
            cv2.putText(img,"z: " + str(np.round(z,2)),(500,150), cv2.FONT_HERSHEY_PLAIN, 1,(0,0,255))

        end = time.time()
        totalTime = end - start

        fps =  1/totalTime
        print("FPS: ",fps)
        cv2.putText(img,"FPS: "+ str(int(fps)), (20,450),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,0))
        
        mp_drawing.draw_landmarks(
            image=img,
            landmark_list=facelm,
            connections=mp_face_mesh.FACEMESH_TESSELATION,
            connection_drawing_spec=drawing_spec
        )

    cv2.imshow("Head Pose Estimation ", img)

    if cv2.waitKey(5) & 0xFF ==27:
        break

cap.release()
cv2.destroyAllWindows()
    


