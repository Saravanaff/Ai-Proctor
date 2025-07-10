import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Sample Question ${i + 1}?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
}));


const ExamPage: React.FC = () => {
    
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [blocked, setBlocked] = useState(false);
  

  const handleChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };


  useEffect(() => {
    try {

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

    }catch(e){
      console.log("Error in useEffect");
    }
  }, []);


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
        <button className={styles.submitButton}>Submit</button>
      </main>

      <FloatingCamera socket={socket}/>
    </div>
  );
};

export default ExamPage;
