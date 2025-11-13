import { useRef, useEffect } from "react";
import socket from "@/components/socket";
import { getExamId, getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import {
  getNumberOfMicrophones,
  getTabSwitchViolations,
} from "@/constants/violationConsts";

const userId = getUserId() || "unknown";
const examId = getExamId();
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const EndPage = () => {
  const hasSavedScore = useRef(false);
  const hasCleanedMedia = useRef(false);

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
      console.error(
        "Error saving score:",
        error.response?.data || error.message
      );
      throw error;
    }
  };

  // ✅ CRITICAL: Safety cleanup - Stop any lingering media tracks
  useEffect(() => {
    if (!hasCleanedMedia.current) {
      hasCleanedMedia.current = true;
      console.log(
        "🛑 End page: Performing safety cleanup of all media resources"
      );

      try {
        // Stop all video elements on the page
        const videoElements = document.querySelectorAll("video");
        videoElements.forEach((video) => {
          if (video.srcObject && video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach((track) => {
              console.log(
                `Stopping track from video element: ${track.kind}, state: ${track.readyState}`
              );
              track.stop();
            });
            video.srcObject = null;
          }
        });

        // Check for any MediaStream tracks that might still be active
        // This is a safety check in case cleanup didn't complete before navigation
        console.log("✅ End page: All video elements cleaned up");
      } catch (error) {
        console.error("Error during end page media cleanup:", error);
      }
    }
  }, []);

  useEffect(() => {
    console.log("📊 End page mounted - saving final score");
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
