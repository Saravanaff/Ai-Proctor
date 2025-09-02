import { useRef } from "react";
import socket from "@/components/socket";
import { getUserId } from "@/constants/AuthStore";
import axios from "axios";

const userId = getUserId() || "unknown";
const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const EndPage =  () => {
  const hasReloaded = useRef(false);



  socket.emit("end-exam",{
    user_id: userId,
    category: "face_camera",
    status: "success",
    message: "Exam Ended successfully"
  });
  new Promise((resolve) => setTimeout(resolve, 2000));
  socket.emit("end-exam",{
      user_id: userId,
      category: "screen_recording",
      status: "success",
      message: "Exam Ended successfully"
  });

  const postData = async () => {
    const examId = localStorage.getItem("examId");
    const token = localStorage.getItem("token");
    console.log(`${baseUrl}/saveScore`);

    try {
      await axios.put(`${baseUrl}/saveScore`, {
        status: "completed",
        userId: userId,
        examId: examId,
      }, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
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