import { useRef } from "react";
import socket from "@/components/socket";
import { getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";


const userId = getUserId() || "unknown";
const examId = localStorage?.getItem("examId") || "unknown";
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const EndPage =  () => {
  const hasReloaded = useRef(false);

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );


  socket.emit("end-exam",{
    user_id: userId,
    exam_id: examId,
    category: "face_camera",
    status: "success",
    message: "Exam Ended successfully"
  });
  new Promise((resolve) => setTimeout(resolve, 2000));
  socket.emit("end-exam",{
      user_id: userId,
      exam_id: examId,
      category: "screen_recording",
      status: "success",
      message: "Exam Ended successfully"
  });

  const postData = async () => {
    
    const token = localStorage.getItem("token");
    console.log(`${baseUrl}/saveScore`);

    try {
      await axios.post(`${baseUrl}/saveScore`, {
        status: "completed",
        examId: examId,
      }
      );
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };

  postData();

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>✅ Exam Submitted</h1>
      <p>thank you for participating</p>
    </div>
  );
};

export default EndPage;