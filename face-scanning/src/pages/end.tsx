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
      });
      console.log("Score saved successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Error saving score:",
        error.response?.data || error.message
      );
      console.error("Full error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const saveScore = async () => {
      if (hasSavedScore.current) return;
      hasSavedScore.current = true;

      const userId = getUserId();
      const examId = getExamId();
      const token = getTokenFromCookie();

      console.log("End page mounted - saving final score");
      console.log("userId:", userId);
      console.log("examId:", examId);
      console.log("baseUrl:", baseUrl);
      console.log("token:", token ? "Present" : "Missing");

      // Validate required data
      if (!userId || userId === "unknown" || !examId || examId === "unknown") {
        const error = `Missing required data - userId: ${userId}, examId: ${examId}`;
        console.error(error);
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      if (!token) {
        const error = "Authentication token not found. Please log in again.";
        console.error(error);
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      if (!baseUrl) {
        const error =
          "Backend URL not configured. Please check environment variables.";
        console.error(error);
        setErrorMessage(error);
        setIsLoading(false);
        return;
      }

      try {
        await postData("/saveScore", {
          status: "completed",
          userId: Number(userId),
          examId: Number(examId),
          numberOfMicrophones: getNumberOfMicrophones() || 0,
          tabSwitchViolations: getTabSwitchViolations() || 0,
        });
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to save score:", err);
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to save exam score";
        setErrorMessage(errorMsg);
        setIsLoading(false);
      }
    };

    saveScore();
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
