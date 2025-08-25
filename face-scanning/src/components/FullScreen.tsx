import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/constants/AuthStore";
const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Sample Question ${i + 1}?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
}));

const ExamPage = ({
  screenRecorderMediaRecorderRef,
  onBeforeSubmit,
  screen,
}: any) => {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [blocked, setBlocked] = useState(false);
  const [lookAlert, setlookAlert] = useState(false);
  const [object, setObject] = useState(false);
  const [num, setNum] = useState(false);
  const [authFaceMissing, setAuthFaceMissing] = useState(false);
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  const [face, setFace] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);

  const router = useRouter();

  const handleAuthFaceMissing = () => {
    console.log("Auth face missing alert triggered");
    setAuthFaceMissing(true);
    setTimeout(() => setAuthFaceMissing(false), 3000);
  };

  const handleChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const detectObject = () => {
    console.log("Object detected");
    setObject(true);
    setTimeout(() => setObject(false), 3000);
  };

  const number = (a: number) => {
    setFace(a);
    setNum(true);
    setTimeout(() => {
      setNum(false);
    }, 2000);
  };

  useEffect(() => {
    try {
      const preventActions: any = (e: any) => {
        if (
          e instanceof KeyboardEvent &&
          ["F12", "Control", "Meta", "Alt", "Tab"].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e instanceof MouseEvent && e.button === 2) {
          e.preventDefault();
        }
      };

      const blurHandler = () => {
        setBlocked(true);
      };

      const focusHandler = () => {
        setBlocked(true);
      };

      const userId = getUserId() || "unknown";

      socket.emit("start-exam", {
        user_id: userId,
        category: "face_camera",
        status: "success",
        message: "Exam Started successfully",
      });

      const fullscreenChangeHandler = () => {
        if (!document.fullscreenElement) {
          setBlocked(true);
        }
      };

      const sizeHandler = () => {
        const widthDiff = Math.abs(window.innerWidth - window.screen.width);
        const heightDiff = Math.abs(window.innerHeight - window.screen.height);
        if (widthDiff > 10 || heightDiff > 10) {
          setBlocked(true);
        }
      };

      return () => {
        window.removeEventListener("blur", blurHandler);
        window.removeEventListener("focus", focusHandler);
        document.removeEventListener(
          "fullscreenchange",
          fullscreenChangeHandler
        );
        window.removeEventListener("keydown", preventActions);
        window.removeEventListener("contextmenu", preventActions);
        window.removeEventListener("copy", preventActions);
        window.removeEventListener("cut", preventActions);
        window.removeEventListener("paste", preventActions);
        window.removeEventListener("resize", sizeHandler);
      };
    } catch (e) {
      console.log("Error in useEffect");
    }
  }, []);
  let s: any;
  const lookingAlert = (side: any) => {
    console.log("looking away");
    s = side;
    setlookAlert(true);
    setTimeout(() => setlookAlert(false), 3000);
  };

  if (blocked) {
    return (
      <div className={styles.overlay}>
        <h1>⚠️ Exam Blocked</h1>
        <br />
        {/* <h2>Tab switch, fullscreen exit, or suspicious resize detected.</h2> */}
      </div>
    );
  }

  return (
    <div className={styles.examContainer}>
      {/* Exam paused overlay */}
      {paused && (
        <div
          className={styles.overlay}
          style={{ zIndex: 2000, background: "var(--overlay-bg)" }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              padding: 20,
              borderRadius: 12,
              boxShadow: "0 10px 30px var(--shadow)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 style={{ marginBottom: 8 }}>Exam Paused</h3>
            <p>Authenticating your identity… Please look at the camera.</p>
          </div>
        </div>
      )}

      <aside className={styles.sidebar}>
        <h3>Sections</h3>
        <ul>
          {questions.map((q) => (
            <li key={q.id}>Q{q.id}</li>
          ))}
        </ul>
      </aside>

      <main className={styles.mainContent}>
        {questions.map((q) => (
          <div key={q.id} className={styles.questionBlock}>
            <h4>
              {q.id}. {q.question}
            </h4>
            <div className={styles.options}>
              {q.options.map((opt, idx) => (
                <label key={idx} className={styles.optionLabel}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => handleChange(q.id, opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          className={styles.submitButton}
          onClick={async () => {
            try {
              if (onBeforeSubmit) await onBeforeSubmit();
            } catch {}
            router.push("/end");
          }}
        >
          Submit
        </button>
      </main>

      {!examSubmitted && (
        <FloatingCamera
          socket={socket}
          onLookingAway={lookingAlert}
          detect={detectObject}
          number={number}
          onAuthFaceMissing={handleAuthFaceMissing}
          examSubmitted={examSubmitted}
          mediaRecorderRef={frontCameraMediaRecorderRef}
          screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
          onAuthPause={() => setPaused(true)}
          onAuthResume={() => setPaused(false)}
        />
      )}

      {lookAlert && (
        <div
          className={styles.alertBox}
          style={{ backgroundColor: "var(--warning-color)" }}
        >
          ⚠️ Please stay focused on the screen! You are Turning {s}
        </div>
      )}

      {object && (
        <div
          className={styles.alertBox}
          style={{ backgroundColor: "var(--error-color)" }}
        >
          📵 Unauthorized device detected (e.g., mobile phone)
        </div>
      )}

      {num && (
        <div
          className={styles.alertBox}
          style={{ backgroundColor: "var(--info-color)" }}
        >
          {face} faces detected.
        </div>
      )}

      {authFaceMissing && (
        <div
          className={styles.alertBox}
          style={{ backgroundColor: "var(--warning-color)" }}
        >
          🧑‍💻 Authenticated face not detected. Please ensure you are in front of
          the camera.
        </div>
      )}
    </div>
  );
};

export default ExamPage;
