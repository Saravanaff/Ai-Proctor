import React from "react";
import { MCQQuestion } from "../../types/mcq";
import LatexRenderer from "./LatexRenderer";

interface MCQQuestionListProps {
  questions: MCQQuestion[];
  onEdit: (question: MCQQuestion) => void;
  onDelete: (questionId: string) => void;
}

/**
 * MCQQuestionList - Displays all created MCQ questions
 * Shows question preview with LaTeX rendering
 */
const MCQQuestionList: React.FC<MCQQuestionListProps> = ({
  questions,
  onEdit,
  onDelete,
}) => {
  if (questions.length === 0) {
    return (
      <div
        className="theme-transition"
        style={{
          padding: "40px 20px",
          textAlign: "center",
          borderRadius: "12px",
          border: "1px dashed var(--border-color)",
          background: "var(--secondary-bg)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📝</div>
        <p
          className="theme-transition"
          style={{
            color: "var(--text-secondary)",
            fontSize: "14px",
            margin: 0,
          }}
        >
          No questions added yet. Click "Add Question" to create your first MCQ.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {questions.map((question, qIndex) => (
        <div
          key={question.id}
          className="theme-transition"
          style={{
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            background: "var(--card-bg)",
          }}
        >
          {/* Question Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                className="theme-transition"
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--accent-color)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                Question {qIndex + 1}
              </div>
              <LatexRenderer
                content={question.question}
                style={{
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  fontWeight: 500,
                  lineHeight: "1.6",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
              <button
                type="button"
                onClick={() => onEdit(question)}
                className="theme-transition"
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--accent-color)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Edit question"
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm("Are you sure you want to delete this question?")
                  ) {
                    onDelete(question.id);
                  }
                }}
                className="theme-transition"
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "#ef4444",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Delete question"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          {/* Options */}
          <div style={{ marginTop: "16px" }}>
            {question.options.map((option, oIndex) => {
              const isCorrect = option.id === question.correctOptionId;
              return (
                <div
                  key={option.id}
                  className="theme-transition"
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "10px 12px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    background: isCorrect
                      ? "rgba(34, 197, 94, 0.1)"
                      : "var(--secondary-bg)",
                    border: isCorrect
                      ? "1px solid #22c55e"
                      : "1px solid var(--border-color)",
                  }}
                >
                  <span
                    className="theme-transition"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      fontWeight: 600,
                      minWidth: "20px",
                    }}
                  >
                    {String.fromCharCode(65 + oIndex)}.
                  </span>
                  <LatexRenderer
                    content={option.text}
                    style={{
                      flex: 1,
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  />
                  {isCorrect && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "#22c55e",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MCQQuestionList;
