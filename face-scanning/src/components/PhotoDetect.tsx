"use client";
import { useEffect, useState } from "react";
import styles from "../styles/FaceScan.module.css";
import { useRouter } from "next/router";
type Status = "pending" | "checking" | "success" | "denied";
export default function Verification() {
  const [videoStatus, setVideoStatus] = useState<Status>("pending");
  const [audioStatus, setAudioStatus] = useState<Status>("pending");
  const [allDone, setAllDone] = useState(false);
  const router =useRouter();

  useEffect(() =>{

    const checkPermissions = async () => {
      setVideoStatus("checking");
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setVideoStatus("success");
      } catch {
        setVideoStatus("denied");
      }

      setAudioStatus("checking");
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setAudioStatus("success");
      } catch {
        setAudioStatus("denied");
      }

      setAllDone(true);
    };

    checkPermissions();
  },[]);

  const renderStatusIcon = (status: Status) => {
    switch (status) {
      case "checking":
        return <span className={styles.icon}>⏳</span>;
      case "success":
        return <span className={styles.icon}>✅</span>;
      case "denied":
        return <span className={styles.icon}>❌</span>;
      case "pending":
        return <span className={styles.icon}>🟡</span>;
    }
  };

  const isVerified = videoStatus === "success" && audioStatus === "success";

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Device Verification</h2>

      <div className={styles.step}>
        {renderStatusIcon(videoStatus)} Camera Access
      </div>

      <div className={styles.step}>
        {renderStatusIcon(audioStatus)} Microphone Access
      </div>

      {allDone && (
        <>
          <div className={isVerified ? styles.successBox : styles.errorBox}>
            {isVerified ? "✅ Verification Complete" : "❌ Verification Failed"}
          </div>

          <button
            className={styles.nextButton}
            disabled={!isVerified}
            onClick={() => router.push('/') }
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}
