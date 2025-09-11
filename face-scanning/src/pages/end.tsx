import { useRef } from "react";
import socket from "@/components/socket";
import { getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { getNumberOfMicrophones, getTabSwitchViolations } from "@/constants/violationConsts";


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

  const postData = async (endpoint : string, data : any) => {
    
    const token = localStorage.getItem("token");
    console.log(`${baseUrl}${endpoint}`);

    try {
      await axios.post(`${baseUrl}${endpoint}`, data);
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };

  postData("/saveScore", {
    status: "completed",
    userId: userId,
    examId: examId,
    numberOfMicrophones: getNumberOfMicrophones(),
    tabSwitchViolations: getTabSwitchViolations(),
  });

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>✅ Exam Submitted</h1>
      <p>thank you for participating</p>
    </div>
  );
};

export default EndPage;