// type Question = {
//     question: string;
//     options: string[];
//   };

//   type Props = {
//     questions: Question[];
//   };

//   const QuestionPanel: React.FC<Props> = ({ questions }) => {
//     return (
//       <div>
//         {questions.map((q, i) => (
//           <div key={i} className="question-block">
//             <p className="question-text">{i + 1}. {q.question}</p>
//             <ul className="option-list">
//               {q.options.map((opt, j) => (
//                 <li key={j}>
//                   <label className="option-item">
//                     <input type="radio" name={`q-${i}`} value={opt} />
//                     <span className="option-label">{opt}</span>
//                   </label>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         ))}

//         <style jsx>{`
//           .question-block {
//             margin-bottom: 2rem;
//           }

//           .question-text {
//             font-size: 1.25rem;
//             font-weight: 600;
//             color: #4c1d95;
//           }

//           .option-list {
//             margin-left: 1rem;
//             margin-top: 0.5rem;
//           }

//           .option-item {
//             display: flex;
//             align-items: center;
//             gap: 0.75rem;
//             background-color: #ede9fe;
//             border-radius: 8px;
//             padding: 12px;
//             cursor: pointer;
//             transition: background-color 0.2s ease;
//             margin-bottom: 8px;
//           }

//           .option-item:hover {
//             background-color: #ddd6fe;
//           }

//           .option-label {
//             font-size: 1rem;
//             color: #1f2937;
//           }
//         `}</style>
//       </div>
//     );
//   };

//   export default QuestionPanel;

//-------------------------------------------------------------------------------------------------------------------------------------------------------------
// import React, { useState } from "react";

// type Question = {
//   question: string;
//   options: string[];
// };

// type Props = {
//   questions: Question[];
// };

// const QuestionPanel: React.FC<Props> = ({ questions }) => {
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
//   const [markedForReview, setMarkedForReview] = useState<number[]>([]);

//   const question = questions[currentQuestionIndex];

//   const handleOptionChange = (value: string) => {
//     setSelectedOptions((prev) => ({
//       ...prev,
//       [currentQuestionIndex]: value,
//     }));
//   };

//   const handleMarkForReview = () => {
//     if (!markedForReview.includes(currentQuestionIndex)) {
//       setMarkedForReview([...markedForReview, currentQuestionIndex]);
//     }
//     alert("Marked for Review");
//   };

//   const handleSubmit = () => {
//     console.log("Selected Answers:", selectedOptions);
//     alert("Answers submitted!");
//     // You can replace this with navigation or backend logic
//   };

//   const styles = {
//     block: {
//       marginBottom: "2rem",
//     },
//     questionText: {
//       fontSize: "1.25rem",
//       fontWeight: 600,
//       color: "#4c1d95",
//     },
//     optionList: {
//       marginLeft: "1rem",
//       marginTop: "0.5rem",
//     },
//     optionItem: {
//       display: "flex",
//       alignItems: "center",
//       gap: "0.75rem",
//       backgroundColor: "#ede9fe",
//       borderRadius: "8px",
//       padding: "12px",
//       cursor: "pointer",
//       transition: "background-color 0.2s ease",
//       marginBottom: "8px",
//     },
//     optionLabel: {
//       fontSize: "1rem",
//       color: "#1f2937",
//     },
//     buttonGroup: {
//       marginTop: "2rem",
//       display: "flex",
//       gap: "1rem",
//     },
//     button: {
//       padding: "10px 20px",
//       borderRadius: "8px",
//       fontWeight: 600,
//       fontSize: "1rem",
//       border: "none",
//       cursor: "pointer",
//     },
//     markBtn: {
//       backgroundColor: "#e0e7ff",
//       color: "#3730a3",
//     },
//     submitBtn: {
//       backgroundColor: "#4f46e5",
//       color: "#fff",
//     },
//   };

//   return (
//     <div>
//       <div style={styles.block}>
//         <p style={styles.questionText}>
//           {currentQuestionIndex + 1}. {question.question}
//         </p>
//         <ul style={styles.optionList}>
//           {question.options.map((opt, j) => (
//             <li key={j}>
//               <label
//                 style={{
//                   ...styles.optionItem,
//                   backgroundColor:
//                     selectedOptions[currentQuestionIndex] === opt
//                       ? "#ddd6fe"
//                       : "#ede9fe",
//                 }}
//               >
//                 <input
//                   type="radio"
//                   name={`q-${currentQuestionIndex}`}
//                   value={opt}
//                   checked={selectedOptions[currentQuestionIndex] === opt}
//                   onChange={() => handleOptionChange(opt)}
//                 />
//                 <span style={styles.optionLabel}>{opt}</span>
//               </label>
//             </li>
//           ))}
//         </ul>
//       </div>

//       <div style={styles.buttonGroup}>
//         <button
//           style={{ ...styles.button, ...styles.markBtn }}
//           onClick={handleMarkForReview}
//         >
//           Mark for Review
//         </button>
//         <button
//           style={{ ...styles.button, ...styles.submitBtn }}
//           onClick={handleSubmit}
//         >
//           Submit
//         </button>
//       </div>
//     </div>
//   );
// };

// export default QuestionPanel;
//-------------------------------------------------------------------------------------------------------------------------------------------------------------

// import React, { useState } from "react";

// type Question = {
//   question: string;
//   options: string[];
// };

// type Props = {
//   questions: Question[];
// };

// const QuestionPanel: React.FC<Props> = ({ questions }) => {
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
//   const [markedForReview, setMarkedForReview] = useState<number[]>([]);

//   const question = questions[currentQuestionIndex];

//   const handleOptionChange = (value: string) => {
//     setSelectedOptions((prev) => ({
//       ...prev,
//       [currentQuestionIndex]: value,
//     }));
//   };

//   const handleMarkForReview = () => {
//     if (!markedForReview.includes(currentQuestionIndex)) {
//       setMarkedForReview([...markedForReview, currentQuestionIndex]);
//     }
//     alert("Marked for Review");
//   };

//   const handleSubmit = () => {
//     console.log("Selected Answers:", selectedOptions);
//     alert("Answers submitted!");
//   };

//   const handleNext = () => {
//     if (currentQuestionIndex < questions.length - 1) {
//       setCurrentQuestionIndex(currentQuestionIndex + 1);
//     } else {
//       alert("This is the last question!");
//     }
//   };

//   const styles = {
//     block: {
//       marginBottom: "2rem",
//     },
//     questionText: {
//       fontSize: "1.25rem",
//       fontWeight: 600,
//       color: "#4c1d95",
//     },
//     optionList: {
//       marginLeft: "1rem",
//       marginTop: "0.5rem",
//     },
//     optionItem: {
//       display: "flex",
//       alignItems: "center",
//       gap: "0.75rem",
//       backgroundColor: "#ede9fe",
//       borderRadius: "8px",
//       padding: "12px",
//       cursor: "pointer",
//       transition: "background-color 0.2s ease",
//       marginBottom: "8px",
//     },
//     optionLabel: {
//       fontSize: "1rem",
//       color: "#1f2937",
//     },
//     buttonGroup: {
//       marginTop: "2rem",
//       display: "flex",
//       gap: "1rem",
//       flexWrap: "wrap" as const,
//     },
//     button: {
//       padding: "10px 20px",
//       borderRadius: "8px",
//       fontWeight: 600,
//       fontSize: "1rem",
//       border: "none",
//       cursor: "pointer",
//     },
//     markBtn: {
//       backgroundColor: "#e0e7ff",
//       color: "#3730a3",
//     },
//     submitBtn: {
//       backgroundColor: "#4f46e5",
//       color: "#fff",
//     },
//     nextBtn: {
//       backgroundColor: "#34d399",
//       color: "#065f46",
//     },
//   };

//   return (
//     <div>
//       <div style={styles.block}>
//         <p style={styles.questionText}>
//           {currentQuestionIndex + 1}. {question.question}
//         </p>
//         <ul style={styles.optionList}>
//           {question.options.map((opt, j) => (
//             <li key={j}>
//               <label
//                 style={{
//                   ...styles.optionItem,
//                   backgroundColor:
//                     selectedOptions[currentQuestionIndex] === opt
//                       ? "#ddd6fe"
//                       : "#ede9fe",
//                 }}
//               >
//                 <input
//                   type="radio"
//                   name={`q-${currentQuestionIndex}`}
//                   value={opt}
//                   checked={selectedOptions[currentQuestionIndex] === opt}
//                   onChange={() => handleOptionChange(opt)}
//                 />
//                 <span style={styles.optionLabel}>{opt}</span>
//               </label>
//             </li>
//           ))}
//         </ul>
//       </div>

//       <div style={styles.buttonGroup}>
//         <button style={{ ...styles.button, ...styles.markBtn }} onClick={handleMarkForReview}>
//           Mark for Review
//         </button>
//         <button style={{ ...styles.button, ...styles.submitBtn }} onClick={handleSubmit}>
//           Submit
//         </button>
//         <button style={{ ...styles.button, ...styles.nextBtn }} onClick={handleNext}>
//           Next
//         </button>
//       </div>
//     </div>
//   );
// };

// export default QuestionPanel;
//-------------------------------------------------------------------------------------------------------------------------------------------------------------

import React, { useState } from "react";

type Question = {
  question: string;
  options: string[];
};

type Props = {
  questions: Question[];
};

const QuestionPanel: React.FC<Props> = ({ questions }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<number, string>
  >({});
  const [markedForReview, setMarkedForReview] = useState<number[]>([]);

  const question = questions[currentQuestionIndex];

  const handleOptionChange = (value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [currentQuestionIndex]: value,
    }));
  };

  const handleMarkForReview = () => {
    if (!markedForReview.includes(currentQuestionIndex)) {
      setMarkedForReview([...markedForReview, currentQuestionIndex]);
    }
    alert("Marked for Review");
  };

  const handleSubmit = () => {
    console.log("Selected Answers:", selectedOptions);
    alert("Answers submitted!");
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      alert("This is the last question!");
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      alert("This is the first question!");
    }
  };

  const styles = {
    block: {
      marginBottom: "2rem",
    },
    questionText: {
      fontSize: "1.25rem",
      fontWeight: 600,
      color: "#4c1d95",
    },
    optionList: {
      marginLeft: "1rem",
      marginTop: "0.5rem",
    },
    optionItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      backgroundColor: "#ede9fe",
      borderRadius: "8px",
      padding: "12px",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      marginBottom: "8px",
    },
    optionLabel: {
      fontSize: "1rem",
      color: "#1f2937",
    },
    buttonGroup: {
      marginTop: "2rem",
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap" as const,
    },
    button: {
      padding: "10px 20px",
      borderRadius: "8px",
      fontWeight: 600,
      fontSize: "1rem",
      border: "none",
      cursor: "pointer",
    },
    markBtn: {
      backgroundColor: "#e0e7ff",
      color: "#3730a3",
    },
    submitBtn: {
      backgroundColor: "#4f46e5",
      color: "#fff",
    },
    nextBtn: {
      backgroundColor: "#8504db",
      color: "#fff",
    },
    prevBtn: {
      backgroundColor: "#8504db",
      color: "#fff",
    },
  };

  return (
    <div>
      <div style={styles.block}>
        <p style={styles.questionText}>
          {currentQuestionIndex + 1}. {question.question}
        </p>
        <ul style={styles.optionList}>
          {question.options.map((opt, j) => (
            <li key={j}>
              <label
                style={{
                  ...styles.optionItem,
                  backgroundColor:
                    selectedOptions[currentQuestionIndex] === opt
                      ? "#ddd6fe"
                      : "#ede9fe",
                }}
              >
                <input
                  type="radio"
                  name={`q-${currentQuestionIndex}`}
                  value={opt}
                  checked={selectedOptions[currentQuestionIndex] === opt}
                  onChange={() => handleOptionChange(opt)}
                />
                <span style={styles.optionLabel}>{opt}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.buttonGroup}>
        <button
          style={{ ...styles.button, ...styles.markBtn }}
          onClick={handleMarkForReview}
        >
          Mark for Review
        </button>
        <button
          style={{ ...styles.button, ...styles.submitBtn }}
          onClick={handleSubmit}
        >
          Submit
        </button>
        <button
          style={{ ...styles.button, ...styles.prevBtn }}
          onClick={handlePrevious}
        >
          Previous
        </button>
        <button
          style={{ ...styles.button, ...styles.nextBtn }}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default QuestionPanel;
