import WebcamFeed from "./WebcamFeed";
import QuestionPanel from "./QuestionPanel";
import {useRouter} from 'next/router';
import React, { useEffect, useState } from "react";
// const dummyQuestions = [
//   {
//     question: "What is the capital of France? Or what is the capital of India or Where is CIT Located",
//     options: ["Berlin", "Madrid", "Paris", "Rome"],
//   },
//   {
//     question: "Which number is prime?",
//     options: ["4", "6", "9", "7"],
//   },
// ];

// export default function ExamPage() {
//   const router = useRouter();
//   const { examId } = router.query;

//   return (
//     <div className="exam-container">
//       <div className="exam-wrapper">
//         <h1 className="exam-title">Exam ID: {examId}</h1>

//         <div className="exam-grid">
//           <div style={{ gridColumnStart: 9, gridRowStart: 1 }}>
//             <WebcamFeed />
//           </div>
//           <div style={{ gridColumn: "1 / span 7", gridRow: "1 / span 7" }}>
//             <QuestionPanel questions={dummyQuestions} />
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         .exam-container {
//           min-height: 100vh;
//           padding: 24px;
//           background: linear-gradient(to bottom right, #ede9fe, #e0f2fe, #bfdbfe);
//           font-family: 'Inter', sans-serif;
//         }
//         .exam-wrapper {
//           max-width: 1400px;
//           margin: 0 auto;
//         }
//         .exam-title {
//           text-align: center;
//           font-size: 2.5rem;
//           font-weight: 800;
//           color: #5b21b6;
//           margin-bottom: 2rem;
//         }
//         .exam-grid {
//           display: grid;
//           grid-template-columns: repeat(9, 1fr);
//           grid-template-rows: repeat(9, 1fr);
//           gap: 16px;
//           min-height: 80vh;
//         }
//       `}</style>
//     </div>
//   );
// }

//-------------------------------------------------------------------------------------------------------------------------------------------------------------

const dummyQuestions = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
  },
  {
    question: "Which number is prime?",
    options: ["4", "6", "9", "7"],
  },
  {
    question: "What is 5 + 3?",
    options: ["6", "7", "8", "9"],
  },
];

export default function ExamPage() {
  const router = useRouter();
  const { examId } = router.query;

  const [timeLeft, setTimeLeft] = useState(60 * 60); // 5 mins (in seconds)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Time's up!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const styles = {
    container: {
      minHeight: "100vh",
      padding: "24px",
      background: "linear-gradient(to bottom right, #ede9fe, #e0f2fe, #bfdbfe)",
      fontFamily: "Inter, sans-serif",
    },
    wrapper: {
      maxWidth: "1400px",
      margin: "0 auto",
    },
    titleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "2rem",
    },
    title: {
      fontSize: "2.5rem",
      fontWeight: 800,
      color: "#5b21b6",
    },
    timer: {
      fontSize: "1.5rem",
      fontWeight: 600,
      color: "#1e3a8a",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(9, 1fr)",
      gridTemplateRows: "repeat(9, 1fr)",
      gap: "16px",
      minHeight: "80vh",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>Exam ID: {examId}</h1>
          <span style={styles.timer}>⏱ {formatTime(timeLeft)}</span>
        </div>

        <div style={styles.grid}>
          <div style={{ gridColumnStart: 9, gridRowStart: 1 }}>
            <WebcamFeed />
          </div>
          <div style={{ gridColumn: "1 / span 7", gridRow: "1 / span 7" }}>
            <QuestionPanel questions={dummyQuestions} />
          </div>
        </div>
      </div>
    </div>
  );
}

