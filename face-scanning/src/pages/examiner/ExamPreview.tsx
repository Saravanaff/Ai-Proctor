import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MCQQuestion, MCQQuestionSubmit } from "../../types/mcq";
import LatexRenderer from "../../components/exam/LatexRenderer";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import styles from "../../styles/CreateExamPage.module.css";
import { ExaminerGuard } from "@/components/guards";

const ExamPreview = () => {
  const router = useRouter();
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [isCreating, setIsCreating] = useState(false);
  const [examData, setExamData] = useState<any>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem("examPreviewData");
    if (!storedData) {
      router.push("/examiner/CreateExamPage");
      return;
    }

    try {
      const data = JSON.parse(storedData);
      setExamData(data);
    } catch (error) {
      console.error("Error parsing exam data:", error);
      router.push("/examiner/CreateExamPage");
    }
  }, [router]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const convertQuestionsToSubmitFormat = (questions: MCQQuestion[]) => {
    return questions.map((q) => {
      const correctIndex = q.options.findIndex(
        (opt) => opt.id === q.correctOptionId
      );
      return {
        question_text: q.question,
        answer: correctIndex.toString(),
        marks: q.marks || 1, // Use the marks from the question, default to 1 if not set
        options: q.options.map((opt) => ({
          option_text: opt.text,
          is_correct: opt.id === q.correctOptionId,
        })),
      };
    });
  };

  const handleConfirm = async () => {
    if (!examData) return;

    setIsCreating(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const formattedQuestions = convertQuestionsToSubmitFormat(
        examData.mcqQuestions
      );

      const payload = {
        exam_name: examData.examName,
        start_time: examData.startTime || null,
        end_time: examData.endTime || null,
        duration: examData.duration || null,
        third_eye_enabled: examData.thirdEye,
        multiple_person_detection_enabled: examData.multiPerson,
        eyeball_detection_enabled: examData.eyeBall,
        object_detection_enabled: examData.objectDetect,
        head_direction_enabled: examData.headDirection,
        flag_notifications_enabled: examData.flagNotifications,
        video_recording_enabled: examData.videoRecording,
        tab_switch_detection_enabled: examData.tabSwitchDetection,
        microphone_detection_enabled: examData.microphoneDetection,
        safe_browser_enabled: examData.safeBrowser,
        proctor_feed_to_test_taker_enabled: examData.proctorFeedToTestTaker,
        screen_sharing_enabled: examData.screenSharing,
        screen_count_detection_enabled: examData.screenCountDetection,
        control_desktop_apps_enabled: examData.controlDesktopApps,
        normal_proctoring: examData.normalProctoring,
        ai_powered_proctoring: examData.aiPoweredProctoring,
        recorded_manual_proctoring: examData.recordedManualProctoring,
        face_authentication_enabled: examData.faceAuthentication,
        questions: formattedQuestions,
      };

      const res = await axios.post(`${base}/examCreate`, payload, {
        headers: {
          Authorization: `Bearer ${getTokenFromCookie()}`,
        },
      });

      // Clear session storage
      sessionStorage.removeItem("examPreviewData");

      // Redirect to create exam page
      router.push("/examiner/CreateExamPage");
    } catch (error: any) {
      console.error("Error creating exam:", error);
      alert(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create exam"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!examData) {
    return (
      <div
        className="theme-transition"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--app-bg)",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const { examName, mcqQuestions } = examData;

  return (
    <ExaminerGuard>
    <div
      className="theme-transition"
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          className="theme-transition"
          style={{
            padding: "32px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            marginBottom: "24px",
          }}
        >
          <h1
            className="theme-transition"
            style={{
              margin: "0 0 12px",
              color: "var(--text-primary)",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            Exam Preview
          </h1>
          <p
            className="theme-transition"
            style={{
              margin: "0 0 24px",
              color: "var(--text-secondary)",
              fontSize: "16px",
            }}
          >
            This is how students will see the exam:{" "}
            <strong style={{ color: "var(--text-primary)" }}>{examName}</strong>
          </p>

          {/* Exam Info */}
          <div
            className="theme-transition"
            style={{
              padding: "16px 20px",
              background: "var(--secondary-bg)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{ color: "var(--text-secondary)", fontSize: "14px" }}
              >
                Total Questions:{" "}
              </span>
              <strong
                style={{ color: "var(--text-primary)", fontSize: "16px" }}
              >
                {mcqQuestions.length}
              </strong>
            </div>
            <div>
              <span
                style={{ color: "var(--text-secondary)", fontSize: "14px" }}
              >
                Question Type:{" "}
              </span>
              <strong
                style={{ color: "var(--text-primary)", fontSize: "16px" }}
              >
                Multiple Choice
              </strong>
            </div>
          </div>
        </div>

        {/* Questions */}
        {mcqQuestions.length === 0 ? (
          <div
            className="theme-transition"
            style={{
              textAlign: "center",
              padding: "80px 20px",
              background: "var(--card-bg)",
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📝</div>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "18px",
                margin: 0,
              }}
            >
              No questions added yet
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {mcqQuestions.map((question: MCQQuestion, qIndex: number) => (
              <div
                key={question.id}
                className="theme-transition"
                style={{
                  padding: "32px",
                  background: "var(--card-bg)",
                  borderRadius: "16px",
                  border: "2px solid var(--border-color)",
                }}
              >
                {/* Question Header */}
                <div style={{ marginBottom: "24px" }}>
                  <div
                    className="theme-transition"
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      background: "var(--accent-color)",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 700,
                      marginBottom: "16px",
                    }}
                  >
                    Question {qIndex + 1}
                  </div>
                  <LatexRenderer
                    content={question.question}
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: 500,
                      lineHeight: "1.7",
                    }}
                  />
                </div>

                {/* Options */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {question.options.map((option, oIndex) => {
                    const isSelected =
                      selectedAnswers[question.id] === option.id;
                    const isCorrect = option.id === question.correctOptionId;

                    return (
                      <label
                        key={option.id}
                        className="theme-transition"
                        style={{
                          display: "flex",
                          alignItems: "start",
                          gap: "16px",
                          padding: "16px 20px",
                          background: isSelected
                            ? "rgba(99, 102, 241, 0.1)"
                            : "var(--secondary-bg)",
                          border: `2px solid ${
                            isSelected
                              ? "var(--accent-color)"
                              : "var(--border-color)"
                          }`,
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor =
                              "var(--accent-color)";
                            e.currentTarget.style.background =
                              "rgba(99, 102, 241, 0.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor =
                              "var(--border-color)";
                            e.currentTarget.style.background =
                              "var(--secondary-bg)";
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name={`preview-question-${question.id}`}
                          checked={isSelected}
                          onChange={() =>
                            handleOptionSelect(question.id, option.id)
                          }
                          style={{
                            marginTop: "4px",
                            width: "22px",
                            height: "22px",
                            cursor: "pointer",
                            accentColor: "var(--accent-color)",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <span
                            className="theme-transition"
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "16px",
                              fontWeight: 700,
                              marginRight: "12px",
                            }}
                          >
                            {String.fromCharCode(65 + oIndex)}.
                          </span>
                          <LatexRenderer
                            content={option.text}
                            style={{
                              color: "var(--text-primary)",
                              fontSize: "16px",
                              display: "inline",
                            }}
                          />
                          {isCorrect && (
                            <span
                              style={{
                                marginLeft: "16px",
                                padding: "4px 12px",
                                background: "#22c55e",
                                color: "#fff",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              ✓ Correct Answer
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="theme-transition"
          style={{
            padding: "24px 32px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            className="theme-transition"
            style={{
              padding: "12px 16px",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "10px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <span
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
              }}
            >
              💡 This is a preview. The green "Correct Answer" tags won't be
              visible to students.
            </span>
          </div>

          <div
            style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}
          >
            <button
              onClick={handleBack}
              disabled={isCreating}
              className={`${styles.btn} theme-transition`}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                background: "var(--secondary-bg)",
                color: "var(--text-primary)",
                fontSize: "16px",
                fontWeight: 600,
                cursor: isCreating ? "not-allowed" : "pointer",
                opacity: isCreating ? 0.6 : 1,
              }}
            >
              ← Back to Edit
            </button>
            <button
              onClick={handleConfirm}
              disabled={isCreating}
              className={`${styles.btn} theme-transition`}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                border: "none",
                background: "var(--accent-color)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 700,
                cursor: isCreating ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                opacity: isCreating ? 0.6 : 1,
              }}
            >
              {isCreating ? "Creating Exam..." : "Confirm & Create Exam →"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ExaminerGuard>
  );
};

export default ExamPreview;
