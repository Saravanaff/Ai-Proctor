import React, { useState, useEffect } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import LatexRenderer from "../../components/exam/LatexRenderer";

const NewExam = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // 1: Name & Questions, 2: Settings
  const [examName, setExamName] = useState("");

  // Section collapse states
  const [normalProctoringOpen, setNormalProctoringOpen] = useState(true);
  const [aiProctoringOpen, setAiProctoringOpen] = useState(true);
  const [manualProctoringOpen, setManualProctoringOpen] = useState(true);
  const [mcqSectionOpen, setMcqSectionOpen] = useState(true);

  // Proctoring feature toggles (defaults ON)
  const [thirdEye, setThirdEye] = useState(true);
  const [multiPerson, setMultiPerson] = useState(true);
  const [eyeBall, setEyeBall] = useState(true);
  const [objectDetect, setObjectDetect] = useState(true);
  const [headDirection, setHeadDirection] = useState(true);
  const [flagNotifications, setFlagNotifications] = useState(true);
  const [videoRecording, setVideoRecording] = useState(true);
  const [tabSwitchDetection, setTabSwitchDetection] = useState(true);
  const [microphoneDetection, setMicrophoneDetection] = useState(true);
  const [safeBrowser, setSafeBrowser] = useState(true);
  const [proctorFeedToTestTaker, setProctorFeedToTestTaker] = useState(true);
  const [screenSharing, setScreenSharing] = useState(true);
  const [screenCountDetection, setScreenCountDetection] = useState(false);
  const [controlDesktopApps, setControlDesktopApps] = useState(false);
  const [normalProctoring, setNormalProctoring] = useState(true);
  const [aiPoweredProctoring, setAiPoweredProctoring] = useState(true);
  const [recordedManualProctoring, setRecordedManualProctoring] =
    useState(true);
  const [faceAuthentication, setFaceAuthentication] = useState(true);

  // MCQ Questions state
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<
    MCQQuestion | undefined
  >(undefined);

  // Restore data from sessionStorage when component mounts (for back navigation from preview)
  useEffect(() => {
    const storedData = sessionStorage.getItem("examPreviewData");
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setExamName(data.examName || "");
        setThirdEye(data.thirdEye ?? true);
        setMultiPerson(data.multiPerson ?? true);
        setEyeBall(data.eyeBall ?? true);
        setObjectDetect(data.objectDetect ?? true);
        setHeadDirection(data.headDirection ?? true);
        setFlagNotifications(data.flagNotifications ?? true);
        setVideoRecording(data.videoRecording ?? true);
        setTabSwitchDetection(data.tabSwitchDetection ?? true);
        setMicrophoneDetection(data.microphoneDetection ?? true);
        setSafeBrowser(data.safeBrowser ?? true);
        setProctorFeedToTestTaker(data.proctorFeedToTestTaker ?? true);
        setScreenSharing(data.screenSharing ?? true);
        setScreenCountDetection(data.screenCountDetection ?? false);
        setControlDesktopApps(data.controlDesktopApps ?? false);
        setNormalProctoring(data.normalProctoring ?? true);
        setAiPoweredProctoring(data.aiPoweredProctoring ?? true);
        setRecordedManualProctoring(data.recordedManualProctoring ?? true);
        setFaceAuthentication(data.faceAuthentication ?? true);
        setMcqQuestions(data.mcqQuestions || []);

        // If coming back from preview, set to step 2 (settings)
        // since they likely want to adjust settings
        setCurrentStep(2);
      } catch (error) {
        console.error("Error restoring exam data:", error);
      }
    }
  }, []);

  // Handler for AI Proctoring toggle that controls related features
  const handleAiProctoringToggle = () => {
    const newState = !aiPoweredProctoring;
    setAiPoweredProctoring(newState);
    if (!newState) {
      setThirdEye(false);
      setMultiPerson(false);
      setEyeBall(false);
      setObjectDetect(false);
      setHeadDirection(false);
      setFaceAuthentication(false);
    } else {
      setThirdEye(true);
      setMultiPerson(true);
      setEyeBall(true);
      setObjectDetect(true);
      setHeadDirection(true);
      setFaceAuthentication(true);
    }
  };

  const handleNormalProctoringToggle = () => {
    const newState = !normalProctoring;
    setNormalProctoring(newState);
    if (!newState) {
      setControlDesktopApps(false);
      setScreenCountDetection(false);
      setSafeBrowser(false);
      setTabSwitchDetection(false);
      setMicrophoneDetection(false);
    } else {
      setControlDesktopApps(true);
      setScreenCountDetection(true);
      setSafeBrowser(true);
      setTabSwitchDetection(true);
      setMicrophoneDetection(true);
    }
  };

  const handleManualProctoringToggle = () => {
    const newState = !recordedManualProctoring;
    setRecordedManualProctoring(newState);
    if (!newState) {
      setFlagNotifications(false);
      setVideoRecording(false);
      setProctorFeedToTestTaker(false);
      setScreenSharing(false);
    } else {
      setFlagNotifications(true);
      setVideoRecording(true);
      setProctorFeedToTestTaker(true);
      setScreenSharing(true);
    }
  };

  const handleAddQuestion = (question: MCQQuestion) => {
    if (editingQuestion) {
      setMcqQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? question : q))
      );
      setEditingQuestion(undefined);
    } else {
      setMcqQuestions((prev) => [...prev, question]);
    }
    setShowQuestionEditor(false);
  };

  const handleEditQuestion = (question: MCQQuestion) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  };

  const handleDeleteQuestion = (id: string) => {
    setMcqQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleCancelQuestionEditor = () => {
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
  };

  const handlePreview = () => {
    // Move to step 2 (Settings)
    setCurrentStep(2);
  };

  const handleBackToQuestions = () => {
    setCurrentStep(1);
  };

  const handleFinalSubmit = () => {
    sessionStorage.setItem(
      "examPreviewData",
      JSON.stringify({
        examName,
        thirdEye,
        multiPerson,
        eyeBall,
        objectDetect,
        headDirection,
        flagNotifications,
        videoRecording,
        tabSwitchDetection,
        microphoneDetection,
        safeBrowser,
        proctorFeedToTestTaker,
        screenSharing,
        screenCountDetection,
        controlDesktopApps,
        normalProctoring,
        aiPoweredProctoring,
        recordedManualProctoring,
        faceAuthentication,
        mcqQuestions,
      })
    );
    router.push("/examiner/ExamPreview");
  };

  const Toggle = ({
    label,
    enabled,
    onToggle,
    disabled = false,
  }: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--secondary-bg)",
        border: "1px solid var(--border-color)",
        transition: "all 0.2s ease",
      }}
      className="theme-transition"
    >
      <span
        className="theme-transition"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-pressed={enabled}
        disabled={disabled}
        className="theme-transition"
        style={{
          position: "relative",
          width: 48,
          height: 26,
          borderRadius: 999,
          border: "none",
          background: enabled ? "var(--accent-color)" : "#ddd",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s ease",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: enabled ? 24 : 2,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );

  const CollapsibleSection = ({
    title,
    subtitle,
    isOpen,
    onToggle,
    masterToggle,
    masterEnabled,
    onMasterToggle,
    children,
    icon,
  }: {
    title: string;
    subtitle: string;
    isOpen: boolean;
    onToggle: () => void;
    masterToggle?: boolean;
    masterEnabled?: boolean;
    onMasterToggle?: () => void;
    children: React.ReactNode;
    icon: string;
  }) => (
    <div
      className="theme-transition"
      style={{
        marginBottom: 16,
        border: "2px solid var(--border-color)",
        borderRadius: 14,
        background: "var(--card-bg)",
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isOpen ? "var(--secondary-bg)" : "transparent",
          borderBottom: isOpen ? "1px solid var(--border-color)" : "none",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <span style={{ fontSize: "24px" }}>{icon}</span>
          <div>
            <h3
              className="theme-transition"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h3>
            <p
              className="theme-transition"
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {masterToggle && (
            <button
              type="button"
              onClick={onMasterToggle}
              className="theme-transition"
              style={{
                position: "relative",
                width: 52,
                height: 28,
                borderRadius: 999,
                border: "none",
                background: masterEnabled ? "var(--accent-color)" : "#ddd",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: masterEnabled ? 26 : 2,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          )}
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && <div style={{ padding: "20px" }}>{children}</div>}
    </div>
  );

  const getEnabledFeaturesCount = () => {
    let count = 0;
    if (normalProctoring)
      count += [
        controlDesktopApps,
        screenCountDetection,
        safeBrowser,
        tabSwitchDetection,
        microphoneDetection,
      ].filter(Boolean).length;
    if (aiPoweredProctoring)
      count += [
        thirdEye,
        multiPerson,
        eyeBall,
        objectDetect,
        headDirection,
        faceAuthentication,
      ].filter(Boolean).length;
    if (recordedManualProctoring)
      count += [
        flagNotifications,
        videoRecording,
        proctorFeedToTestTaker,
      ].filter(Boolean).length;
    return count;
  };

  return (
    <div
      className="theme-transition"
      style={{
        minHeight: "100vh",
        background: "var(--primary-bg)",
        transition: "background 0.3s ease",
      }}
    >
      {/* Header */}
      <header
        className="theme-transition"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--border-color)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => router.push("/examiner/CreateExamPage")}
            className="theme-transition"
            style={{
              background: "var(--secondary-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
          >
            <span>←</span> Back
          </button>
          <div>
            <h1
              className="theme-transition"
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                marginBottom: "4px",
              }}
            >
              Create New Exam - Step {currentStep} of 2
            </h1>
            <p
              className="theme-transition"
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {currentStep === 1 && "Setup exam name and questions"}
              {currentStep === 2 &&
                `Configure exam settings • ${
                  mcqQuestions.length
                } questions • ${getEnabledFeaturesCount()} features enabled`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Step Indicator */}
          <div style={{ display: "flex", gap: "8px", marginRight: "16px" }}>
            {[1, 2].map((step) => (
              <div
                key={step}
                style={{
                  width: currentStep === step ? "32px" : "10px",
                  height: "10px",
                  borderRadius: "5px",
                  background:
                    currentStep >= step
                      ? "var(--accent-color)"
                      : "var(--border-color)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          display: "flex",
          gap: "24px",
          padding: "32px",
          maxWidth: "1200px",
          margin: "0 auto",
          alignItems: "flex-start",
        }}
      >
        {/* Form */}
        <div
          style={{
            flex: "1",
            maxWidth: "100%",
          }}
        >
          {/* STEP 1: Exam Name & Questions */}
          {currentStep === 1 && (
            <>
              {/* Exam Name */}
              <div
                className={`${styles.glassPanel} theme-transition`}
                style={{
                  padding: "24px",
                  borderRadius: "14px",
                  marginBottom: "16px",
                }}
              >
                <label
                  className="theme-transition"
                  style={{
                    display: "block",
                    marginBottom: "12px",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "15px",
                  }}
                >
                  📝 Exam Name *
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="Enter exam name (e.g., Midterm Mathematics Exam)"
                  className="input-theme theme-transition"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    fontSize: "15px",
                    outline: "none",
                    border: "2px solid var(--border-color)",
                    background: "var(--secondary-bg)",
                  }}
                />
              </div>

              {/* MCQ Section */}
              <CollapsibleSection
                title="MCQ Questions"
                subtitle={`Add multiple choice questions (${mcqQuestions.length} questions added)`}
                icon="❓"
                isOpen={mcqSectionOpen}
                onToggle={() => setMcqSectionOpen(!mcqSectionOpen)}
              >
                {showQuestionEditor && (
                  <MCQQuestionEditor
                    onSave={handleAddQuestion}
                    onCancel={handleCancelQuestionEditor}
                    initialQuestion={editingQuestion}
                  />
                )}

                {!showQuestionEditor && mcqQuestions.length > 0 && (
                  <MCQQuestionList
                    questions={mcqQuestions}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                  />
                )}

                {!showQuestionEditor && mcqQuestions.length === 0 && (
                  <div
                    className="theme-transition"
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    No questions added yet. Click the button below to add your
                    first question.
                  </div>
                )}

                {!showQuestionEditor && (
                  <button
                    type="button"
                    onClick={() => setShowQuestionEditor(true)}
                    className="theme-transition"
                    style={{
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: "2px dashed var(--accent-color)",
                      background: "transparent",
                      color: "var(--accent-color)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      marginTop: mcqQuestions.length > 0 ? 16 : 0,
                      transition: "all 0.2s ease",
                    }}
                  >
                    + Add New Question
                  </button>
                )}
              </CollapsibleSection>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={() => router.push("/examiner/CreateExamPage")}
                  className={`${styles.btn} ${styles.btnGhost} theme-transition`}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!examName.trim() || mcqQuestions.length === 0}
                  className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    opacity:
                      !examName.trim() || mcqQuestions.length === 0 ? 0.6 : 1,
                    cursor:
                      !examName.trim() || mcqQuestions.length === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Next: Settings →
                </button>
              </div>
            </>
          )}

          {/* STEP 2: Exam Settings */}
          {currentStep === 2 && (
            <>
              {/* Proctoring Sections */}
              <CollapsibleSection
                title="Normal Proctoring"
                subtitle="Basic monitoring and browser control features"
                icon="🖥️"
                isOpen={normalProctoringOpen}
                onToggle={() => setNormalProctoringOpen(!normalProctoringOpen)}
                masterToggle
                masterEnabled={normalProctoring}
                onMasterToggle={handleNormalProctoringToggle}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Control Desktop Apps"
                    enabled={controlDesktopApps}
                    onToggle={() => setControlDesktopApps((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Screen Count Detection"
                    enabled={screenCountDetection}
                    onToggle={() => setScreenCountDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Safe Browser"
                    enabled={safeBrowser}
                    onToggle={() => setSafeBrowser((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Tab Switch Detection"
                    enabled={tabSwitchDetection}
                    onToggle={() => setTabSwitchDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Microphone Detection"
                    enabled={microphoneDetection}
                    onToggle={() => setMicrophoneDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="AI Powered Proctoring"
                subtitle="Advanced AI-based monitoring and detection"
                icon="🤖"
                isOpen={aiProctoringOpen}
                onToggle={() => setAiProctoringOpen(!aiProctoringOpen)}
                masterToggle
                masterEnabled={aiPoweredProctoring}
                onMasterToggle={handleAiProctoringToggle}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Third Eye"
                    enabled={thirdEye}
                    onToggle={() => setThirdEye((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Multiple Person Detection"
                    enabled={multiPerson}
                    onToggle={() => setMultiPerson((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Eyeball Detection"
                    enabled={eyeBall}
                    onToggle={() => setEyeBall((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Object Detection"
                    enabled={objectDetect}
                    onToggle={() => setObjectDetect((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Head Direction"
                    enabled={headDirection}
                    onToggle={() => setHeadDirection((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Face Authentication"
                    enabled={faceAuthentication}
                    onToggle={() => setFaceAuthentication((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Recorded Manual Proctoring"
                subtitle="Recording and manual review capabilities"
                icon="📹"
                isOpen={manualProctoringOpen}
                onToggle={() => setManualProctoringOpen(!manualProctoringOpen)}
                masterToggle
                masterEnabled={recordedManualProctoring}
                onMasterToggle={handleManualProctoringToggle}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Flag Notifications"
                    enabled={flagNotifications}
                    onToggle={() => setFlagNotifications((v) => !v)}
                    disabled={!recordedManualProctoring}
                  />
                  <Toggle
                    label="Video Recording"
                    enabled={videoRecording}
                    onToggle={() => setVideoRecording((v) => !v)}
                    disabled={!recordedManualProctoring}
                  />
                  <Toggle
                    label="Proctor Feed to Test Taker"
                    enabled={proctorFeedToTestTaker}
                    onToggle={() => setProctorFeedToTestTaker((v) => !v)}
                    disabled={!recordedManualProctoring}
                  />
                </div>
              </CollapsibleSection>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={handleBackToQuestions}
                  className={`${styles.btn} ${styles.btnGhost} theme-transition`}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ← Back to Questions
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Preview & Create Exam →
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewExam;
