import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";

const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Sample Question ${i + 1}?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
}));



const ExamPage: React.FC = () => {
    
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [blocked, setBlocked] = useState(false);
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
    const [initialSize, setInitialSize] = useState<{ width: number; height: number } | null>(null);

useEffect(() => {
  setInitialSize({ width: window.innerWidth, height: window.innerHeight });
}, []);

  const handleChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const requestFullscreen = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen) await (el as any).msRequestFullscreen();
      setFullscreenAllowed(true);
    } catch (err) {
      alert("You must allow fullscreen to continue the exam.");
    }
  };

  useEffect(() => {
    // Start webcam only after page loads
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    });

    const preventActions = (e: any) => {
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
      if (fullscreenAllowed) setBlocked(true);
    };

    const focusHandler = () => {
      if (fullscreenAllowed) setBlocked(true);
    };

    const fullscreenChangeHandler = () => {
      if (!document.fullscreenElement && fullscreenAllowed) {
        setBlocked(true);
      }
    };

    const sizeHandler = () => {
      const widthDiff = Math.abs(window.innerWidth - window.screen.width);
      const heightDiff = Math.abs(window.innerHeight - window.screen.height);
      if ((widthDiff > 10 || heightDiff > 10) && fullscreenAllowed) {
        setBlocked(true);
      }
    };

    window.addEventListener("blur", blurHandler);
    window.addEventListener("focus", focusHandler);
    document.addEventListener("fullscreenchange", fullscreenChangeHandler);
    window.addEventListener("keydown", preventActions);
    window.addEventListener("contextmenu", preventActions);
    window.addEventListener("copy", preventActions);
    window.addEventListener("cut", preventActions);
    window.addEventListener("paste", preventActions);
    window.addEventListener("resize", sizeHandler);

    return () => {
      window.removeEventListener("blur", blurHandler);
      window.removeEventListener("focus", focusHandler);
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
      window.removeEventListener("keydown", preventActions);
      window.removeEventListener("contextmenu", preventActions);
      window.removeEventListener("copy", preventActions);
      window.removeEventListener("cut", preventActions);
      window.removeEventListener("paste", preventActions);
      window.removeEventListener("resize", sizeHandler);
    };
  }, [fullscreenAllowed]);

  if (!fullscreenAllowed) {
    return (
      <div className={styles.blockScreen}>
        <h2>Fullscreen is required to start the exam</h2>
        <button onClick={requestFullscreen}>Enter Fullscreen</button>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className={styles.overlay}>
        <h2>⚠️ Exam Blocked</h2>
        <p>Tab switch, fullscreen exit, or suspicious resize detected.</p>
      </div>
    );
  }

  return (
    <div className={styles.examContainer}>
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
            <h4>{q.id}. {q.question}</h4>
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
        <button className={styles.submitButton}>Submit</button>
      </main>

      <FloatingCamera />
      <video ref={videoRef} style={{ display: "none" }} autoPlay muted />
    </div>
  );
};

export default ExamPage;
