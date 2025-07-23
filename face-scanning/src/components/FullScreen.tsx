import React, { useEffect, useState } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Sample Question ${i + 1}?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
}));


interface ExamPageProps {
  screenSharingRef: React.RefObject<HTMLVideoElement | null>;
  screenSharingStream: MediaStream | null;
  onStopRecording?: () => void;
}

const ExamPage: React.FC<ExamPageProps> = ({ screenSharingRef, screenSharingStream, onStopRecording }) => {
    
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [blocked, setBlocked] = useState(false);
  const [lookAlert,setlookAlert]=useState(false);
  const [object,setObject]=useState(false);
  const [num, setNum] = useState(false);
  const [authFaceMissing, setAuthFaceMissing] = useState(false);
  const [faceCount, setFaceCount] = useState<number>(0);
  
  const router = useRouter();

  const handleAuthFaceMissing = () => {
    setAuthFaceMissing(true);
    setTimeout(() => setAuthFaceMissing(false), 3000);
  };

  

  const handleSubmit = () => {
    // Stop recording before submitting
    if (onStopRecording) {
      onStopRecording();
    }
    router.push('/end');
  };

  const handleChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const detectObject=()=>{
    setObject(true);
    setTimeout(()=>setObject(false),3000);
  }

  const number = (a: number) => {
    setFaceCount(a);
    setNum(true);
    setTimeout(() => setNum(false), 3000);
  }

  useEffect(() => {
    try {

      const preventKeyboardActions = (e: KeyboardEvent) => {
        if (["F12", "Control", "Meta", "Alt", "Tab"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const preventMouseActions = (e: MouseEvent) => {
        if (e.button === 2) {
          e.preventDefault();
        }
      };

      const preventClipboardActions = (e: Event) => {
        e.preventDefault();
      };

      const blurHandler = () => {
        setBlocked(true);
      };

      const focusHandler = () => {
        setBlocked(true);
      };

      

      const fullscreenChangeHandler = () => {
        if (!document.fullscreenElement) {
          setBlocked(true);
        }
      };

      const sizeHandler = () => {
        const widthDiff = Math.abs(window.innerWidth - window.screen.width);
        const heightDiff = Math.abs(window.innerHeight - window.screen.height);
        if ((widthDiff > 10 || heightDiff > 10)) {
          setBlocked(true);
        }
      };

      window.addEventListener("blur", blurHandler);
      document.addEventListener("fullscreenchange", fullscreenChangeHandler);
      window.addEventListener("keydown", preventKeyboardActions);
      window.addEventListener("contextmenu", preventMouseActions);
      window.addEventListener("copy", preventClipboardActions);
      window.addEventListener("cut", preventClipboardActions);
      window.addEventListener("paste", preventClipboardActions);
      window.addEventListener("resize", sizeHandler);

    
      return () => {
        window.removeEventListener("blur", blurHandler);
        document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
        window.removeEventListener("keydown", preventKeyboardActions);
        window.removeEventListener("contextmenu", preventMouseActions);
        window.removeEventListener("copy", preventClipboardActions);
        window.removeEventListener("cut", preventClipboardActions);
        window.removeEventListener("paste", preventClipboardActions);
        window.removeEventListener("resize", sizeHandler);
      };

    } catch (e) {
      console.log("Error in useEffect", e);
    }
  }, []);
  
  const [lookDirection, setLookDirection] = useState<string>('');
  const lookingAlert = (side: string) => {
    setLookDirection(side);
    setlookAlert(true);
    setTimeout(() => setlookAlert(false), 3000);
  }


  if (blocked) {
    return (
      <div className={styles.overlay}>
        <h1>⚠️ Exam Blocked</h1><br/>
        {/* <h2>Tab switch, fullscreen exit, or suspicious resize detected.</h2> */}
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
        <button className={styles.submitButton} onClick={handleSubmit}>Submit</button>
      </main>

      <FloatingCamera 
        socket={socket}
        onLookingAway={lookingAlert}
        detect={detectObject} 
        number={number} 
        onAuthFaceMissing={handleAuthFaceMissing}
        screenSharingRef={screenSharingRef}
        screenSharingStream={screenSharingStream}
      />
        {lookAlert && (
          <div className={styles.alertBox} style={{ backgroundColor: "#fdd835" }}>
            ⚠️ Please stay focused on the screen! You are Turning {lookDirection}
          </div>
        )}

        {object && (
          <div className={styles.alertBox} style={{ backgroundColor: "#e53935" }}>
            📵 Unauthorized device detected (e.g., mobile phone)
          </div>
        )}

        {num && (
          <div className={styles.alertBox} style={{ backgroundColor: "#1e88e5" }}>
            👥 {faceCount} faces detected.
          </div>
        )}

        {authFaceMissing && (
          <div className={styles.alertBox} style={{ backgroundColor: "#8e24aa" }}>
            🧑‍💻 Authenticated face not detected. Please ensure you are in front of the camera.
          </div>
        )}

    </div>
  );
};

export default ExamPage;
