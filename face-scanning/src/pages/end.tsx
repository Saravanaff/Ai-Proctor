import { useEffect, useRef } from "react";
import socket from "@/components/socket";
import { getUserId } from "@/constants/AuthStore";
import { delay } from "@/utils/delay";
import axios from "axios";

const userId = getUserId() || "unknown";

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
    try {
      await axios.put(`/saveScore`, {
        status: "completed",
        userId: userId,
        examId: examId,
      });
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };

  postData();

  // useEffect(() => {
  //   if (!hasReloaded.current) {
  //     hasReloaded.current = true;
  //     window.location.reload();
  //   }
  // }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>✅ Exam Submitted</h1>
      <p>thank you for participating</p>
    </div>
  );
};

export default EndPage;