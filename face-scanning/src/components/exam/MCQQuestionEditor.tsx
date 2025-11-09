import React, { useState } from "react";
import LatexRenderer from "./LatexRenderer";
import { MCQOption, MCQQuestion } from "../../types/mcq";

interface MCQQuestionEditorProps {
  onSave: (question: MCQQuestion) => void;
  onCancel: () => void;
  initialQuestion?: MCQQuestion;
}

/**
 * MCQQuestionEditor - A modular component for creating/editing MCQ questions
 * Features:
 * - LaTeX support with live preview
 * - Dynamic options (add/remove)
 * - Solution selection from options
 */
const MCQQuestionEditor: React.FC<MCQQuestionEditorProps> = ({
  onSave,
  onCancel,
  initialQuestion,
}) => {
  const [questionText, setQuestionText] = useState(
    initialQuestion?.question || ""
  );
  const [options, setOptions] = useState<MCQOption[]>(
    initialQuestion?.options || [
      { id: "opt-1", text: "" },
      { id: "opt-2", text: "" },
    ]
  );
  const [correctOptionId, setCorrectOptionId] = useState(
    initialQuestion?.correctOptionId || ""
  );
  const [showPreview, setShowPreview] = useState(false);

  const handleAddOption = () => {
    const newId = `opt-${Date.now()}`;
    setOptions([...options, { id: newId, text: "" }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      alert("A question must have at least 2 options");
      return;
    }
    setOptions(options.filter((opt) => opt.id !== id));
    if (correctOptionId === id) {
      setCorrectOptionId("");
    }
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleSave = () => {
    // Validation
    if (!questionText.trim()) {
      alert("Please enter a question");
      return;
    }

    const filledOptions = options.filter((opt) => opt.text.trim());
    if (filledOptions.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }

    if (
      !correctOptionId ||
      !filledOptions.find((opt) => opt.id === correctOptionId)
    ) {
      alert("Please select the correct answer");
      return;
    }

    const question: MCQQuestion = {
      id: initialQuestion?.id || `q-${Date.now()}`,
      question: questionText,
      options: filledOptions,
      correctOptionId,
    };

    onSave(question);
  };

  return (
    <div
      className="theme-transition"
      style={{
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        background: "var(--card-bg)",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4
          className="theme-transition"
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          {initialQuestion ? "Edit Question" : "New Question"}
        </h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="theme-transition"
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: showPreview
                ? "var(--accent-color)"
                : "var(--secondary-bg)",
              color: showPreview ? "#fff" : "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {showPreview ? "📝 Edit" : "👁️ Preview"}
          </button>
        </div>
      </div>

      {/* LaTeX Guide */}
      <div
        className="theme-transition"
        style={{
          padding: "10px 12px",
          borderRadius: "8px",
          background: "var(--secondary-bg)",
          marginBottom: "16px",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}
      >
        💡 <strong>LaTeX Tips:</strong> Use <code>$formula$</code> for inline
        math (e.g., $x^2$) or <code>$$formula$$</code> for display math (e.g.,
        $$\int_0^1 x^2 dx$$)
      </div>

      {!showPreview ? (
        <>
          {/* Question Input */}
          <div style={{ marginBottom: "20px" }}>
            <label
              className="theme-transition"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Question *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question here. Use LaTeX for math: $x^2 + y^2 = z^2$"
              className="input-theme theme-transition"
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <label
                className="theme-transition"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Options * (Select the correct answer)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="theme-transition"
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--accent-color)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                + Add Option
              </button>
            </div>

            {options.map((option, index) => (
              <div
                key={option.id}
                className="theme-transition"
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  border:
                    correctOptionId === option.id
                      ? "2px solid var(--accent-color)"
                      : "1px solid var(--border-color)",
                  background:
                    correctOptionId === option.id
                      ? "rgba(99, 102, 241, 0.1)"
                      : "var(--secondary-bg)",
                }}
              >
                {/* Radio for correct answer */}
                <input
                  type="radio"
                  name="correct-option"
                  checked={correctOptionId === option.id}
                  onChange={() => setCorrectOptionId(option.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "var(--accent-color)",
                  }}
                  title="Mark as correct answer"
                />

                {/* Option label */}
                <span
                  className="theme-transition"
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    fontWeight: 600,
                    minWidth: "20px",
                  }}
                >
                  {String.fromCharCode(65 + index)}.
                </span>

                {/* Option text */}
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) =>
                    handleOptionTextChange(option.id, e.target.value)
                  }
                  placeholder="Enter option text (LaTeX supported: $x^2$)"
                  className="input-theme theme-transition"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "monospace",
                  }}
                />

                {/* Remove button */}
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(option.id)}
                    className="theme-transition"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--secondary-bg)",
                      color: "var(--text-secondary)",
                      fontSize: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    title="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Preview Mode */
        <div
          className="theme-transition"
          style={{
            padding: "20px",
            borderRadius: "8px",
            background: "var(--secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h5
              className="theme-transition"
              style={{
                margin: "0 0 12px",
                color: "var(--text-primary)",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Question Preview:
            </h5>
            <LatexRenderer
              content={questionText || "No question text"}
              style={{
                color: "var(--text-primary)",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            />
          </div>

          <div>
            <h5
              className="theme-transition"
              style={{
                margin: "0 0 12px",
                color: "var(--text-primary)",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Options:
            </h5>
            {options.map((option, index) => (
              <div
                key={option.id}
                className="theme-transition"
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "10px 12px",
                  marginBottom: "8px",
                  borderRadius: "6px",
                  background:
                    correctOptionId === option.id
                      ? "rgba(34, 197, 94, 0.1)"
                      : "var(--card-bg)",
                  border:
                    correctOptionId === option.id
                      ? "1px solid #22c55e"
                      : "1px solid var(--border-color)",
                }}
              >
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {String.fromCharCode(65 + index)}.
                </span>
                <LatexRenderer
                  content={option.text || "Empty option"}
                  style={{
                    flex: 1,
                    color: "var(--text-primary)",
                    fontSize: "14px",
                  }}
                />
                {correctOptionId === option.id && (
                  <span
                    style={{
                      color: "#22c55e",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Correct
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="theme-transition"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--secondary-bg)",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="theme-transition"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            background: "var(--accent-color)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {initialQuestion ? "Update Question" : "Add Question"}
        </button>
      </div>
    </div>
  );
};

export default MCQQuestionEditor;
