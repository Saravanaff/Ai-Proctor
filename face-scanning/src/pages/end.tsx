import { useRef, useEffect } from "react";
import socket from "@/components/socket";
import { getExamId, getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { getNumberOfMicrophones, getTabSwitchViolations } from "@/constants/violationConsts";


const userId = getUserId() || "unknown";
const examId = getExamId();
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const EndPage = () => {
  const hasSavedScore = useRef(false);

  const postData = async (endpoint: string, data: any) => {
    const token = getTokenFromCookie();
    console.log(`Posting to: ${baseUrl}${endpoint}`);

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, data, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      console.log("Score saved successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error saving score:", error.response?.data || error.message);
      throw error;
    }
  };

  useEffect(() => {
    console.log("End page mounted - saving final score");
    if (!hasSavedScore.current) {
      hasSavedScore.current = true;
      postData("/saveScore", {
        status: "completed",
        userId: Number(userId),
        examId: Number(examId),
        numberOfMicrophones: getNumberOfMicrophones() || 0,
        tabSwitchViolations: getTabSwitchViolations() || 0,
      }).catch((err) => {
        console.error("Failed to save score:", err);
      });
    }
  }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>✅ Exam Submitted</h1>
      <p>thank you for participating</p>
    </div>
  );
};

export default EndPage;