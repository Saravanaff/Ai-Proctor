import WebcamFeed from "./WebcamFeed";
import QuestionPanel from "./QuestionPanel";
import {useRouter} from 'next/router';
import '@/styles/Exam.module.css';

const dummyQuestions = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
  },
  {
    question: "Which number is prime?",
    options: ["4", "6", "9", "7"],
  },
];

export default function ExamPage() {
  const router = useRouter();
  const { examId } = router.query;

  return (
    <div className="exam-container">
      <div className="exam-wrapper">
        <h1 className="exam-title">Exam ID: {examId}</h1>

        <div className="exam-grid">
          {/* Webcam placed at grid row 1, column 3 */}
          <div
            style={{
              gridColumnStart: 3,
              gridRowStart: 1,
            }}
          >
            <WebcamFeed />
          </div>

          {/* Question panel spans entire grid underneath */}
          <div
            style={{
              gridColumn: "1 / span 9",
              gridRow: "1 / span 9",
            }}
          >
            <QuestionPanel questions={dummyQuestions} />
          </div>
        </div>
      </div>
    </div>
  );
}
