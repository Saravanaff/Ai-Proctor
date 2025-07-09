import '@/styles/QuestionPanel.module.css';

type Question = {
    question: string;
    options: string[];
  };
  
  type Props = {
    questions: Question[];
  };
  
  const QuestionPanel: React.FC<Props> = ({ questions }) => {
    return (
      <div>
        {questions.map((q, i) => (
          <div key={i} className="question-block">
            <p className="question-text">
              {i + 1}. {q.question}
            </p>
            <ul className="option-list">
              {q.options.map((opt, j) => (
                <li key={j}>
                  <label className="option-item">
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={opt}
                    />
                    <span className="option-label">{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };
  
  export default QuestionPanel;