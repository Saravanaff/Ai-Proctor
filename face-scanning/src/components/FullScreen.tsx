import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/constants/AuthStore";
import axios from 'axios';
import { getTokenFromCookie } from "@/constants/AuthStore";


const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Sample Question ${i + 1}?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
}));


const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL;
  const userId = getUserId() || "unknown";

type ExamSettings = {
  third_eye_enabled?: boolean;
  multiple_person_detection_enabled?: boolean;
  eyeball_detection_enabled?: boolean;
  object_detection_enabled?: boolean;
  head_direction_enabled?: boolean;
  flag_notifications_enabled?: boolean
};


const ExamPage = ({
  screenRecorderMediaRecorderRef,
  onBeforeSubmit,
}: any) => {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [blocked, setBlocked] = useState(false);
  const [lookAlert, setlookAlert] = useState(false);
  const [object, setObject] = useState(false);
  const [num, setNum] = useState(false);
  const [authFaceMissing, setAuthFaceMissing] = useState(false);
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  const [face, setFace] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [headDirection, setHeadDirection] = useState(false);
  const [examSettings, setExamSettings] = useState<ExamSettings>({});

  
  const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);

  const router = useRouter();

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );



  useEffect(() => {
      const fetchExamSettings = async (payload: any) => {
      try {

        const response = await axios.get(`${baseUrl}/getExamSettings`, {
            params: payload,
        });
        console.log("Exam settings fetched:", response.data);
        setExamSettings(response.data);
      } catch (error) {
        console.error("Failed to fetch exam settings:", error);
      }
    }

    const examId = localStorage.getItem("examId");
    fetchExamSettings({userId: Number(userId), examId: Number(examId)});
  }, []);


  const detectObject = () => {
    console.log("Object detected");
    if (examSettings?.flag_notifications_enabled!==true && examSettings?.object_detection_enabled !== false) {
      setObject(true);
      setTimeout(() => setObject(false), 3000);
    }
  };



  const number = (a: number) => {
    setFace(a);
    if (examSettings?.multiple_person_detection_enabled !== false) {
      setNum(true);
      setTimeout(() => {
        setNum(false);
      }, 2000);
    }
  };

  useEffect(() => {
    try {
      const preventActions: any = (e: any) => {
        if (
          e instanceof KeyboardEvent &&
          ["F12", "Control", "Meta", "Alt", "Tab"].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e instanceof MouseEvent && e.button === 2) {
          e.preventDefault();
        }
      };

      const blurHandler = () => {
        setBlocked(true);
      };

      const focusHandler = () => {
        setBlocked(true);
      };

      const userId = getUserId() || "unknown";

      socket.emit("start-exam", {
        user_id: userId,
        category: "face_camera",
        status: "success",
        message: "Exam Started successfully",
      });

      const fullscreenChangeHandler = () => {
        if (!document.fullscreenElement) {
          setBlocked(true);
        }
      };

      const sizeHandler = () => {
        const widthDiff = Math.abs(window.innerWidth - window.screen.width);
        const heightDiff = Math.abs(window.innerHeight - window.screen.height);
        if (widthDiff > 10 || heightDiff > 10) {
          setBlocked(true);
        }
      };

      return () => {
        window.removeEventListener("blur", blurHandler);
        window.removeEventListener("focus", focusHandler);
        document.removeEventListener(
          "fullscreenchange",
          fullscreenChangeHandler
        );
        window.removeEventListener("keydown", preventActions);
        window.removeEventListener("contextmenu", preventActions);
        window.removeEventListener("copy", preventActions);
        window.removeEventListener("cut", preventActions);
        window.removeEventListener("paste", preventActions);
        window.removeEventListener("resize", sizeHandler);
      };
    } catch (e) {
      console.log("Error in useEffect");
    }
  }, []);
  let s: any;
  const lookingAlert = (side: any) => {
    console.log("looking away");
    s = side;
    if (examSettings?.flag_notifications_enabled!=false && examSettings?.head_direction_enabled!=false && examSettings?.eyeball_detection_enabled!=false) {
      setlookAlert(true);
      setTimeout(() => setlookAlert(false), 3000);
    }
  };

  const handleAuthFaceMissing = () => {
    console.log("Auth face missing alert triggered");
      setAuthFaceMissing(true);
      setTimeout(() => setAuthFaceMissing(false), 3000);
  };

  const handleHeadDirection = (direction: string) => {
    console.log("Head direction changed:", direction);
    if (examSettings?.flag_notifications_enabled!==true && examSettings?.head_direction_enabled !=false) {
      setHeadDirection(true);
      setTimeout(() => setHeadDirection(false), 3000);
    }
  };

  const handleChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };



  if (blocked) {
    return (
      <div className={`${styles.overlay} theme-transition`}>
        <div className={`${styles.blockScreen} theme-transition`}>
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              padding: "40px",
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 50px var(--shadow)",
              textAlign: "center",
              maxWidth: "500px",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
                color: "var(--error-color)",
              }}
            >
              🚫
            </div>
            <h1
              className="theme-transition"
              style={{
                color: "var(--text-primary)",
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "16px",
                transition: "color 0.3s ease",
              }}
            >
              Exam Access Blocked
            </h1>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "16px",
                lineHeight: 1.6,
                margin: 0,
                transition: "color 0.3s ease",
              }}
            >
              Suspicious activity detected. Please contact your examiner for
              assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.examContainer} theme-transition`}>
      {paused && (
        <div
          className={`${styles.overlay} theme-transition`}
          style={{ zIndex: 2000 }}
        >
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              padding: "32px",
              borderRadius: "16px",
              boxShadow: "0 20px 50px var(--shadow)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
              maxWidth: "400px",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--warning-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "white",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              ||
            </div>
            <h3
              className="theme-transition"
              style={{
                marginBottom: "12px",
                color: "var(--text-primary)",
                fontSize: "20px",
                fontWeight: 600,
                transition: "color 0.3s ease",
              }}
            >
              Exam Paused
            </h3>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                lineHeight: 1.5,
                margin: 0,
                transition: "color 0.3s ease",
              }}
            >
              Authenticating your identity… Please look at the camera.
            </p>
          </div>
        </div>
      )}

      <aside className={`${styles.sidebar} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            padding: "20px 0",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "20px",
            transition: "border-color 0.3s ease",
          }}
        >
          <h3
            className="theme-transition"
            style={{
              color: "var(--text-primary)",
              fontSize: "16px",
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.01em",
              transition: "color 0.3s ease",
            }}
          >
            Questions
          </h3>
        </div>
        <div className={styles.questionNavigation}>
          {questions.map((q) => (
            <div
              key={q.id}
              className={`${styles.questionNavItem} theme-transition ${
                answers[q.id] ? styles.answered : ""
              }`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "8px",
                background: answers[q.id]
                  ? "var(--success-bg)"
                  : "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span
                className="theme-transition"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  transition: "color 0.3s ease",
                }}
              >
                Q{q.id}
              </span>
              {answers[q.id] && (
                <span
                  style={{
                    color: "var(--success-color)",
                    fontSize: "14px",
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          className="theme-transition"
          style={{
            marginTop: "20px",
            padding: "16px",
            background: "var(--info-bg)",
            border: "1px solid var(--info-color)",
            borderRadius: "8px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              className="theme-transition"
              style={{
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                transition: "color 0.3s ease",
              }}
            >
              Progress
            </span>
          </div>
          <div
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "12px",
              transition: "color 0.3s ease",
            }}
          >
            {Object.keys(answers).length} of {questions.length} answered
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "var(--border-color)",
              borderRadius: "2px",
              marginTop: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${
                  (Object.keys(answers).length / questions.length) * 100
                }%`,
                height: "100%",
                background: "var(--success-color)",
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </aside>

      <main className={`${styles.mainContent} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            marginBottom: "30px",
            padding: "24px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            boxShadow: "0 2px 8px var(--shadow)",
            transition: "all 0.3s ease",
          }}
        >
          <h2
            className="theme-transition"
            style={{
              color: "var(--text-primary)",
              fontSize: "24px",
              fontWeight: 600,
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}
          >
            Online Assessment
          </h2>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              margin: 0,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
          >
            Read each question carefully and select the best answer. This session is proctored for academic integrity.
          </p>
        </div>

        {questions.map((q, index) => (
          <div
            key={q.id}
            className={`${styles.questionBlock} theme-transition`}
          >
            <div
              className="theme-transition"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                className="theme-transition"
                style={{
                  background: answers[q.id]
                    ? "var(--success-color)"
                    : "var(--secondary-bg)",
                  color: answers[q.id] ? "white" : "var(--text-primary)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  flexShrink: 0,
                  border: `2px solid ${
                    answers[q.id]
                      ? "var(--success-color)"
                      : "var(--border-color)"
                  }`,
                  transition: "all 0.3s ease",
                }}
              >
                {answers[q.id] ? "✓" : q.id}
              </div>
              <h4
                className="theme-transition"
                style={{
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.4,
                  transition: "color 0.3s ease",
                }}
              >
                {q.question}
              </h4>
            </div>
            <div className={styles.options}>
              {q.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`${styles.optionLabel} theme-transition ${
                    answers[q.id] === opt ? styles.selected : ""
                  }`}
                  style={{
                    background:
                      answers[q.id] === opt
                        ? "var(--accent-color)"
                        : "var(--secondary-bg)",
                    color:
                      answers[q.id] === opt ? "white" : "var(--text-primary)",
                    border: `2px solid ${
                      answers[q.id] === opt
                        ? "var(--accent-color)"
                        : "var(--border-color)"
                    }`,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => handleChange(q.id, opt)}
                    style={{ display: "none" }}
                  />
                  <div
                    className="theme-transition"
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: "2px solid",
                      borderColor:
                        answers[q.id] === opt ? "white" : "var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {answers[q.id] === opt && (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "white",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 500,
                    }}
                  >
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div
          className="theme-transition"
          
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
            padding: "20px 0",
          }}
        >
          <button
            className={`${styles.submitButton} theme-transition`}
            onClick={async () => {
              try {
                if (onBeforeSubmit) await onBeforeSubmit();
              } catch {}
              router.push("/end");
            }}
            style={{
              background:
                "linear-gradient(135deg, var(--accent-color) 0%, #0284c7 100%)",
              border: "none",
              color: "white",
              padding: "16px 48px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.25)",
              transition: "all 0.3s ease",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(14, 165, 233, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(14, 165, 233, 0.25)";
            }}
          >
            🚀 Submit Exam
          </button>
        </div>
      </main>

      {!examSubmitted && (
        <FloatingCamera
          settings={examSettings}
          socket={socket}
          onLookingAway={lookingAlert}
          detect={detectObject}
          number={number}
          onAuthFaceMissing={handleAuthFaceMissing}
          onHeadDirection={handleHeadDirection}
          examSubmitted={examSubmitted}
          mediaRecorderRef={frontCameraMediaRecorderRef}
          screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
          onAuthPause={() => setPaused(true)}
          onAuthResume={() => setPaused(false)}
        />
      )}

      {/* Conditionally render alerts based on exam settings */}
      {lookAlert && examSettings?.flag_notifications_enabled!== true && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👀</span>
            <span style={{ fontWeight: 600 }}>
              Please stay focused on the screen! You are turning {s}
            </span>
          </div>
        </div>
      )}

      {object && examSettings?.object_detection_enabled !== false && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%)",
            border: "1px solid var(--error-color)",
            boxShadow: "0 8px 25px rgba(239, 68, 68, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📱</span>
            <span style={{ fontWeight: 600 }}>
              Unauthorized device detected (e.g., mobile phone)
            </span>
          </div>
        </div>
      )}

      {num && examSettings?.multiple_person_detection_enabled !== false && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--info-color) 0%, #2563eb 100%)",
            border: "1px solid var(--info-color)",
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👥</span>
            <span style={{ fontWeight: 600 }}>{face} faces detected</span>
          </div>
        </div>
      )}

      {authFaceMissing && examSettings?.eyeball_detection_enabled !== false && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <span style={{ fontWeight: 600 }}>
              Authenticated face not detected. Please ensure you are in front of
              the camera.
            </span>
          </div>
        </div>
      )}

      {headDirection && examSettings?.head_direction_enabled !== false && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🧭</span>
            <span style={{ fontWeight: 600 }}>
              Please keep your head facing forward
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPage;
