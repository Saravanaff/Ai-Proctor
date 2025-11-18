import { useRef, useEffect, useState } from "react";
import socket from "@/components/socket";
import { getExamId, getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import {
  getNumberOfMicrophones,
  getTabSwitchViolations,
} from "@/constants/violationConsts";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const EndPage = () => {
  const hasSavedScore = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ Get userId and examId inside component
  const userId = getUserId() || "unknown";
  const examId = getExamId();

  const postData = async (endpoint: string, data: any) => {
    const token = getTokenFromCookie();
    console.log(`Posting to: ${baseUrl}${endpoint}`);
    console.log("Request data:", data);
    console.log("Token:", token ? "Present" : "Missing");

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, data, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        timeout: 10000, // ✅ 10 second timeout
      });
      console.log("✅ Request successful:", response.data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Server responded with error status
        console.error("❌ Server error:", {
          status: error.response.status,
          data: error.response.data,
          endpoint
        });
      } else if (error.request) {
        // Request made but no response
        console.error("❌ No response from server:", endpoint);
      } else {
        // Something else happened
        console.error("❌ Request error:", error.message);
      }
      throw error;
    }
  };

  useEffect(() => {
    console.log("📊 End page mounted - saving final score");
    if (!hasSavedScore.current) {
      hasSavedScore.current = true;
      
      // ✅ Add a small delay to ensure backend is ready
      setTimeout(() => {
        postData("/saveScore", {
          status: "completed",
          userId: Number(userId),
          examId: Number(examId),
          numberOfMicrophones: getNumberOfMicrophones() || 0,
          tabSwitchViolations: getTabSwitchViolations() || 0,
        })
        .then((data) => {
          console.log("✅ Score saved successfully:", data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("❌ Failed to save score:", {
            error: err.response?.data || err.message,
            userId,
            examId,
          });
        });
      }, 1000); // Wait 1 second for backend to be ready
    }
  }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      {isLoading ? (
        <>
          <h1>⏳ Submitting Exam...</h1>
          <p>Please wait while we save your results</p>
        </>
      ) : errorMessage ? (
        <>
          <h1>⚠️ Submission Error</h1>
          <p style={{ color: "red", marginTop: "20px" }}>{errorMessage}</p>
          <div style={{ marginTop: "30px", color: "#666" }}>
            <p>Please contact your exam administrator with the error above.</p>
            <p>Check the browser console (F12) for more details.</p>
          </div>
        </>
      ) : (
        <>
          <h1>✅ Exam Submitted</h1>
          <p>Thank you for participating</p>
        </>
      )}
    </div>
  );
};

export default EndPage;
