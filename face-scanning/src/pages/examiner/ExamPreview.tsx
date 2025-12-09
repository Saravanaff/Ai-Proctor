import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MCQQuestion, MCQQuestionSubmit } from "../../types/mcq";
import LatexRenderer from "../../components/exam/LatexRenderer";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import styles from "../../styles/CreateExamPage.module.css";
import { ExaminerGuard } from "@/components/guards";
import { FileText, Mail, CheckCircle, Loader } from "lucide-react";
import { LoadingScreen } from "@/components/PageTransition";

const ExamPreview = () => {
  const router = useRouter();
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [isCreating, setIsCreating] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState<'exam' | 'students' | 'done' | null>(null);
  const [studentProgress, setStudentProgress] = useState({ current: 0, total: 0 });

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

  useEffect(() => {
    // Set light theme background
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = "#f8fafc";
    
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
      document.documentElement.style.background = "";
    };
  }, []);

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
    setLoadingStep('exam');
    
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

      // Create the exam
      const res = await axios.post(`${base}/examCreate`, payload, {
        headers: {
          Authorization: `Bearer ${getTokenFromCookie()}`,
        },
      });

      console.log("✅ Exam created successfully:", res.data);

      // If students were added, invite them
      if (examData.students && Array.isArray(examData.students) && examData.students.length > 0) {
        setLoadingStep('students');
        setStudentProgress({ current: 0, total: examData.students.length });
        
        try {
          const examId = res.data.exam?.id;
          if (!examId) {
            console.error("❌ No exam ID in response");
            alert("Exam created but could not invite students: No exam ID returned");
          } else {
            console.log(`📧 Inviting ${examData.students.length} students to exam ${examId}...`);
            
            const inviteRes = await axios.post(
              `${base}/exam/${examId}/invite-students`,
              {
                examId,
                students: examData.students,
              },
              {
                headers: {
                  Authorization: `Bearer ${getTokenFromCookie()}`,
                },
              }
            );

            console.log("✅ Student invitation response:", inviteRes.data);
            
            // Update progress
            setStudentProgress({ 
              current: examData.students.length, 
              total: examData.students.length 
            });

            // Mark as done
            setLoadingStep('done');
            
            // Wait a moment to show the success state
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show detailed results
            if (inviteRes.data.success) {
              const { results, details } = inviteRes.data;
              let message = `Exam created successfully!\n\n`;
              message += `Students invited: ${results.successful}/${results.total}\n`;
              
              if (results.failed > 0) {
                message += `Failed: ${results.failed}\n`;
              }
              
              if (results.emailsFailed > 0) {
                message += `\nEmail delivery failed for ${results.emailsFailed} student(s). Accounts were created but emails could not be sent.`;
              }

              if (details.emailsFailed.length > 0) {
                message += `\n\nEmails failed for: ${details.emailsFailed.map((e: any) => e.email).join(', ')}`;
              }

              alert(message);
            } else {
              alert("Exam created but failed to invite students. Please check the console for details.");
            }
          }
        } catch (inviteError: any) {
          console.error("❌ Error inviting students:", inviteError);
          alert(
            `Exam created successfully but failed to invite students:\n${
              inviteError?.response?.data?.message || inviteError.message
            }`
          );
        }
      } else {
        setLoadingStep('done');
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert("Exam created successfully!");
      }

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
      setLoadingStep(null);
      setStudentProgress({ current: 0, total: 0 });
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!examData) {
    return <LoadingScreen />;
  }

  const { examName, mcqQuestions } = examData;

  return (
    <ExaminerGuard>
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
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
          style={{
            padding: "32px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
          }}
        >
          <h1
            className="theme-transition"
            style={{
              margin: "0 0 12px",
              color: "#1e293b",
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
              color: "#64748b",
              fontSize: "16px",
            }}
          >
            This is how students will see the exam:{" "}
            <strong style={{ color: "#1e293b" }}>{examName}</strong>
          </p>

          {/* Exam Info */}
          <div
            className="theme-transition"
            style={{
              padding: "16px 20px",
              background: "#f1f5f9",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{ color: "#64748b", fontSize: "14px" }}
              >
                Total Questions:{" "}
              </span>
              <strong
                style={{ color: "#1e293b", fontSize: "16px" }}
              >
                {mcqQuestions.length}
              </strong>
            </div>
            <div>
              <span
                style={{ color: "#64748b", fontSize: "14px" }}
              >
                Question Type:{" "}
              </span>
              <strong
                style={{ color: "#1e293b", fontSize: "16px" }}
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
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📝</div>
            <p
              className="theme-transition"
              style={{
                color: "#64748b",
                fontSize: "18px",
                margin: 0,
              }}
            >
              No questions added yet
            </p>
          </div>
        ) : (
          <div
            className="theme-transition"
            style={{
              padding: "32px",
              background: "#ffffff",
              borderRadius: "16px",
              border: "2px solid #e2e8f0",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                fontSize: "20px",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              📚 Questions Summary
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#0ea5e9",
                    marginBottom: "4px",
                  }}
                >
                  {mcqQuestions.length}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Total Questions
                </div>
              </div>
              <div
                style={{
                  padding: "16px",
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#10b981",
                    marginBottom: "4px",
                  }}
                >
                  {mcqQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Total Marks
                </div>
              </div>
              <div
                style={{
                  padding: "16px",
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#f59e0b",
                    marginBottom: "4px",
                  }}
                >
                  MCQ
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Question Type
                </div>
              </div>
            </div>
            
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                background: "#f1f5f9",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#64748b",
                  lineHeight: "1.6",
                }}
              >
                💡 All {mcqQuestions.length} questions have been added to your exam. Students will see them one by one during the test with answer options but without the correct answer indicators.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="theme-transition"
          style={{
            padding: "24px 32px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
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
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "18px" }}>ℹ️</span>
            <span
              className="theme-transition"
              style={{
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              This is a preview. Questions are ready and configured for the exam.
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
                border: "1px solid #e2e8f0",
                background: "#f1f5f9",
                color: "#1e293b",
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
                background: "#0ea5e9",
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

      {/* Loading Modal */}
      {loadingStep && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="theme-transition"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "48px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "center",
                  color: "#0ea5e9",
                }}
              >
                {loadingStep === 'exam' && <FileText size={64} strokeWidth={2} />}
                {loadingStep === 'students' && <Mail size={64} strokeWidth={2} />}
                {loadingStep === 'done' && <CheckCircle size={64} strokeWidth={2} color="#10b981" />}
              </div>
              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                {loadingStep === 'exam' && "Creating Exam..."}
                {loadingStep === 'students' && "Sending Invitations..."}
                {loadingStep === 'done' && "All Done!"}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#64748b",
                }}
              >
                {loadingStep === 'exam' && "Setting up your exam with all questions and settings"}
                {loadingStep === 'students' && `Sending invitation emails to ${studentProgress.total} student${studentProgress.total !== 1 ? 's' : ''}`}
                {loadingStep === 'done' && "Exam created and invitations sent successfully!"}
              </p>
            </div>

            {/* Progress Indicator */}
            <div style={{ marginBottom: "24px" }}>
              {loadingStep === 'students' && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    <span>Progress</span>
                    <span>{studentProgress.current} / {studentProgress.total}</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "linear-gradient(90deg, #0ea5e9, #10b981)",
                        borderRadius: "4px",
                        width: `${(studentProgress.current / studentProgress.total) * 100}%`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </>
              )}
              
              {(loadingStep === 'exam' || (loadingStep === 'students' && studentProgress.current === 0)) && (
                <div style={{ textAlign: "center", display: "flex", justifyContent: "center" }}>
                  <Loader 
                    size={60} 
                    strokeWidth={3}
                    color="#0ea5e9"
                    style={{
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              )}

              {loadingStep === 'done' && (
                <div
                  style={{
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  <CheckCircle 
                    size={80} 
                    strokeWidth={2.5}
                    style={{
                      animation: "scaleIn 0.5s ease",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Status Steps */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  background: loadingStep === 'exam' || loadingStep === 'students' || loadingStep === 'done' 
                    ? "#f1f5f9" 
                    : "transparent",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: loadingStep === 'students' || loadingStep === 'done'
                      ? "#10b981"
                      : "#0ea5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {loadingStep === 'students' || loadingStep === 'done' ? "✓" : "1"}
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  Exam Creation
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  background: loadingStep === 'students' || loadingStep === 'done'
                    ? "#f1f5f9"
                    : "transparent",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  opacity: loadingStep === 'exam' ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: loadingStep === 'done'
                      ? "#10b981"
                      : loadingStep === 'students'
                      ? "#0ea5e9"
                      : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {loadingStep === 'done' ? "✓" : "2"}
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  Sending Invitations
                </span>
              </div>
            </div>

            {/* Note */}
            <div
              style={{
                marginTop: "24px",
                padding: "12px 16px",
                background: "#f1f5f9",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#64748b",
                textAlign: "center",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <span>Please don't close this window while we process your request</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes scaleIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
    </ExaminerGuard>
  );
};

export default ExamPreview;

