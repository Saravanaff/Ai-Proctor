import React, { useState } from "react";
import { MCQQuestion } from "../../types/mcq";

interface PDFQuestionUploaderProps {
  onQuestionsExtracted: (questions: MCQQuestion[]) => void;
  onClose: () => void;
}

/**
 * PDFQuestionUploader - Component for uploading and parsing PDF files
 * Extracts MCQ questions from PDF on the client-side and stores them for later use
 */
const PDFQuestionUploader: React.FC<PDFQuestionUploaderProps> = ({
  onQuestionsExtracted,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<MCQQuestion[]>([]);
  const [error, setError] = useState("");

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Dynamic import of pdf.js
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => {
            // Check if item and item.str exist
            if (item && typeof item.str === "string") {
              return item.str;
            }
            return "";
          })
          .join(" ");
        fullText += pageText + "\n";
      }

      if (!fullText.trim()) {
        setError(
          "No text found in PDF. The PDF might be image-based or empty."
        );
        setIsProcessing(false);
        return;
      }

      setExtractedText(fullText);
      parseQuestions(fullText);
    } catch (err: any) {
      console.error("Error processing PDF:", err);
      setError(
        err?.message ||
          "Failed to process PDF. Please try again or enter questions manually."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const parseQuestions = (text: string) => {
    try {
      if (!text || !text.trim()) {
        setError("No text content found in PDF.");
        return;
      }

      const questions: MCQQuestion[] = [];

      // Split by common question delimiters
      const lines = text.split(/\n/);
      let currentQuestion: any = null;
      let questionCounter = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Check if line starts with a question number pattern
        const questionMatch = line.match(
          /^(?:Q|Question)?\s*(\d+)[\.\)]\s*(.+)/i
        );

        if (questionMatch && questionMatch[2]) {
          // Save previous question if exists
          if (
            currentQuestion &&
            currentQuestion.options &&
            currentQuestion.options.length >= 2
          ) {
            questions.push({
              id: `q-${Date.now()}-${questionCounter++}`,
              question: currentQuestion.question || "",
              options: currentQuestion.options,
              correctOptionId:
                currentQuestion.correctOptionId ||
                currentQuestion.options[0]?.id ||
                "",
            });
          }

          // Start new question
          currentQuestion = {
            question: questionMatch[2].trim(),
            options: [],
            correctOptionId: "",
          };
        }
        // Check if line is an option (A), a), 1), etc.
        else if (currentQuestion && /^[A-Da-d1-4][\.\)]\s*(.+)/.test(line)) {
          const optionMatch = line.match(/^[A-Da-d1-4][\.\)]\s*(.+)/);
          if (optionMatch && optionMatch[1]) {
            const optionId = `opt-${Date.now()}-${
              currentQuestion.options.length
            }`;
            currentQuestion.options.push({
              id: optionId,
              text: optionMatch[1].trim(),
            });
          }
        }
        // Check for answer/correct option indicators
        else if (
          currentQuestion &&
          /^(?:Answer|Correct|Solution)[\:\s]+([A-Da-d1-4])/i.test(line)
        ) {
          const answerMatch = line.match(
            /^(?:Answer|Correct|Solution)[\:\s]+([A-Da-d1-4])/i
          );
          if (answerMatch && answerMatch[1]) {
            const answerIndex = answerMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            if (
              currentQuestion.options &&
              currentQuestion.options[answerIndex]
            ) {
              currentQuestion.correctOptionId =
                currentQuestion.options[answerIndex].id;
            }
          }
        }
        // If the line doesn't match any pattern and we have a current question, append to question text
        else if (
          currentQuestion &&
          (!currentQuestion.options || currentQuestion.options.length === 0)
        ) {
          currentQuestion.question += " " + line;
        }
      }

      // Add last question
      if (
        currentQuestion &&
        currentQuestion.options &&
        currentQuestion.options.length >= 2
      ) {
        questions.push({
          id: `q-${Date.now()}-${questionCounter++}`,
          question: currentQuestion.question || "",
          options: currentQuestion.options,
          correctOptionId:
            currentQuestion.correctOptionId ||
            currentQuestion.options[0]?.id ||
            "",
        });
      }

      if (questions.length === 0) {
        setError(
          "No questions found in PDF. Please ensure the PDF follows a standard MCQ format (Q1. Question text? A) Option1 B) Option2...)"
        );
      } else {
        // Store parsed questions for later use
        setParsedQuestions(questions);
      }
    } catch (err: any) {
      console.error("Error parsing questions:", err);
      setError(
        err?.message ||
          "Failed to parse questions. Please check the PDF format."
      );
    }
  };

  const handleUseQuestions = () => {
    onQuestionsExtracted(parsedQuestions);
    onClose();
  };

  return (
    <div
      className="theme-transition"
      style={{
        padding: "24px",
        background: "var(--card-bg)",
        borderRadius: "12px",
        border: "2px solid var(--border-color)",
        marginBottom: "16px",
      }}
    >
      <h3
        className="theme-transition"
        style={{
          margin: "0 0 16px",
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        📄 Upload Question Paper (PDF)
      </h3>

      <p
        className="theme-transition"
        style={{
          margin: "0 0 16px",
          fontSize: "14px",
          color: "var(--text-secondary)",
        }}
      >
        Upload a PDF file containing MCQ questions. The PDF will be parsed
        automatically on your device (client-side). Supported formats:
        <br />
        <code
          style={{
            display: "block",
            marginTop: "8px",
            padding: "8px",
            background: "var(--secondary-bg)",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <strong>Format 1:</strong>
          <br />
          Q1. What is 2+2?
          <br />
          A) 3<br />
          B) 4<br />
          C) 5<br />
          D) 6<br />
          Answer: B<br />
          <br />
          <strong>Format 2:</strong>
          <br />
          1. What is the capital of France?
          <br />
          a) London
          <br />
          b) Paris
          <br />
          c) Berlin
          <br />
          d) Madrid
          <br />
          Correct: b
        </code>
      </p>

      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <label
          htmlFor="pdf-upload"
          className="theme-transition"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--accent-color)",
            color: "#fff",
            borderRadius: "8px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "14px",
            opacity: isProcessing ? 0.6 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {isProcessing ? "Processing..." : "📤 Choose PDF File"}
        </label>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isProcessing}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <div
          className="theme-transition"
          style={{
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {extractedText && (
        <div
          className="theme-transition"
          style={{
            padding: "12px",
            background: "var(--secondary-bg)",
            borderRadius: "8px",
            maxHeight: "200px",
            overflow: "auto",
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginBottom: "16px",
          }}
        >
          <strong>Extracted Text Preview:</strong>
          <pre style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>
            {extractedText.substring(0, 500)}...
          </pre>
        </div>
      )}

      {parsedQuestions.length > 0 && (
        <div
          className="theme-transition"
          style={{
            padding: "16px",
            background: "var(--secondary-bg)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            marginBottom: "16px",
          }}
        >
          <h4
            className="theme-transition"
            style={{
              margin: "0 0 12px",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            ✅ Successfully Parsed {parsedQuestions.length} Questions
          </h4>
          <div
            style={{
              maxHeight: "300px",
              overflow: "auto",
              marginBottom: "12px",
            }}
          >
            {parsedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="theme-transition"
                style={{
                  padding: "12px",
                  background: "var(--card-bg)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "8px",
                }}
              >
                <p
                  className="theme-transition"
                  style={{
                    margin: "0 0 8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Q{idx + 1}. {q.question}
                </p>
                <div
                  style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                >
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={opt.id}
                      style={{
                        marginLeft: "16px",
                        color:
                          opt.id === q.correctOptionId ? "#22c55e" : "inherit",
                        fontWeight: opt.id === q.correctOptionId ? 600 : 400,
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}) {opt.text}
                      {opt.id === q.correctOptionId && " ✓"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleUseQuestions}
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
              width: "100%",
            }}
          >
            ✓ Add {parsedQuestions.length} Questions to Exam
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onClose}
          className="theme-transition"
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PDFQuestionUploader;
