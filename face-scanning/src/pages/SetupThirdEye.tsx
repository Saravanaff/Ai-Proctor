import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import QRCode from "qrcode";
import { getUserEmail, getUserId, getGlobalName } from "@/constants/AuthStore";
import styles from "@/styles/ThirdEyeSetup.module.css";
// Use the shared socket connection (adjust the import path/name if different)
import socket from "@/components/socket";

const userId = getUserId() || "unknown";
const userEmail = getUserEmail() || "unknown";
const userName = getGlobalName() || "unknown";

const ThirdEyeSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const router = useRouter();

  // Add spinner animation
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const steps = [
    {
      id: 1,
      title: "Position Your Mobile Device",
      description:
        "Place your mobile phone to the right side of your laptop at arm's length distance",
      icon: "📱",
    },
    {
      id: 2,
      title: "Ensure Proper Distance",
      description:
        "Keep the mobile device 2-3 feet away from your sitting position",
      icon: "📏",
    },
    {
      id: 3,
      title: "Connect Mobile Device",
      description:
        "Scan QR code with your mobile device and wait for connection",
      icon: "📸",
    },
    {
      id: 4,
      title: "Ready to Start",
      description: "Everything is set up! You can now begin your examination",
      icon: "✅",
    },
  ];

  useEffect(() => {
    const generateQRCode = async () => {
      const redirect = encodeURIComponent("/mobile");
      const name = encodeURIComponent(userName);
      const email = encodeURIComponent(userEmail);
      const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
      const thirdEyeUrl = `${clientUrl}?userId=${userId}&name=${name}&email=${email}&redirect=${redirect}`;
      try {
        const qrUrl = await QRCode.toDataURL(thirdEyeUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generateQRCode();
  }, []);

  // Subscribe to events on the shared socket (do not create a new connection)
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log("Setup page connected to backend");
      socket.emit("register-third-eye-setup", { userId });
    };

    const onMobileConnected = (data: any) => {
      console.log("Mobile device connected:", data);
      setIsConnected(!!data?.status);
    };

    const onDisconnect = () => {
      console.log("Setup page disconnected from backend");
      setIsConnected(false);
    };

    const onReconnect = () => {
      console.log("Socket reconnected, re-registering...");
      socket.emit("register-third-eye-setup", { userId });
    };

    socket.on("connect", onConnect);
    socket.on("mobile-connected", onMobileConnected);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect", onReconnect);

    // Handle already-connected state
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("mobile-connected", onMobileConnected);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect", onReconnect);
    };
  }, []);

  const handleNextStep = () => {
    if (currentStep === 3 && !isConnected) return;
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    router.push("/fullscreen");
  };

  return (
    <div
      style={{
        background: "var(--background)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 800,
          width: "100%",
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          boxShadow: "0 8px 32px var(--shadow)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--secondary-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h1
              style={{
                color: "var(--text-primary)",
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Third Eye Setup
            </h1>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Set up your mobile device for comprehensive exam monitoring
          </p>
        </div>

        <div
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            {steps.map((step, index) => (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      currentStep >= step.id
                        ? "var(--accent-color)"
                        : "var(--secondary-bg)",
                    color:
                      currentStep >= step.id
                        ? "white"
                        : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    transition: "all 0.3s ease",
                  }}
                >
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background:
                        currentStep > step.id
                          ? "var(--accent-color)"
                          : "var(--border-color)",
                      marginLeft: 8,
                      transition: "all 0.3s ease",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Step {currentStep} of {steps.length}
          </div>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {steps[currentStep - 1]?.icon}
            </div>
            <h2
              style={{
                color: "var(--text-primary)",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {steps[currentStep - 1]?.title}
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 16,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {steps[currentStep - 1]?.description}
            </p>
          </div>

          {currentStep === 1 && (
            <div
              style={{
                background: "var(--info-bg)",
                border: "1px solid var(--info-color)",
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 32,
                  alignItems: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>💻</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Your Laptop
                  </div>
                </div>
                <div style={{ fontSize: 24 }}>➡️</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Mobile Device
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "var(--card-bg)",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 14,
                    margin: "0 0 8px 0",
                  }}
                >
                  📍 Positioning Tips:
                </h4>
                <ul
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    margin: 0,
                    paddingLeft: 20,
                  }}
                >
                  <li>Place mobile on a stable surface or stand</li>
                  <li>Ensure camera lens is clean and unobstructed</li>
                  <li>Position at your sitting eye level</li>
                  <li>Maintain 45-degree angle view of your profile</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div
              style={{
                background: "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              {qrCodeUrl ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <img
                    src={qrCodeUrl}
                    alt="Third Eye QR Code"
                    style={{
                      border: "4px solid white",
                      borderRadius: 12,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />

                  <div
                    style={{
                      background: isConnected
                        ? "var(--success-bg)"
                        : "var(--secondary-bg)",
                      border: `1px solid ${
                        isConnected
                          ? "var(--success-color)"
                          : "var(--border-color)"
                      }`,
                      borderRadius: 8,
                      padding: 16,
                      marginTop: 8,
                      width: "100%",
                      maxWidth: 320,
                    }}
                  >
                    {isConnected ? (
                      <>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <div
                          style={{
                            color: "var(--success-color)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          Mobile Device Connected!
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          You can now proceed to the next step
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              border: "3px solid var(--border-color)",
                              borderTop: "3px solid var(--accent-color)",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          Waiting for Mobile Connection...
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          Please scan the QR code with your mobile device
                        </div>
                        <div
                          style={{
                            marginTop: 12,
                            padding: 8,
                            background: "var(--info-bg)",
                            borderRadius: 6,
                            border: "1px solid var(--info-color)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>
                              📱
                            </span>
                            <span
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: 11,
                              }}
                            >
                              Device ID: {userId}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      margin: 0,
                    }}
                  >
                    Generating QR code...
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div
              style={{
                background: "var(--success-bg)",
                border: "1px solid var(--success-color)",
                borderRadius: 12,
                padding: 32,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
              <div
                style={{
                  color: "var(--success-color)",
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                All Set! Ready to Begin
              </div>
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 16,
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                Your third eye monitoring system is connected and ready. Click
                "Start Examination" when you're prepared to begin.
              </div>

              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--success-color)",
                  borderRadius: 8,
                  padding: 16,
                  display: "inline-block",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "var(--success-color)", fontSize: 18 }}>
                    ✅
                  </span>
                  <span
                    style={{
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    Third Eye Connected
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  <span style={{ color: "var(--success-color)", fontSize: 18 }}>
                    📱
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    Device ID: {userId}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: "var(--info-bg)",
                  border: "1px solid var(--info-color)",
                  borderRadius: 8,
                }}
              >
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  💡 Your mobile device will monitor your activity during the
                  examination. Ensure it remains in position throughout the
                  test.
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 32px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--secondary-bg)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "var(--card-bg)",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: currentStep === 1 ? "not-allowed" : "pointer",
              opacity: currentStep === 1 ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            ← Previous
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            {currentStep < steps.length ? (
              <button
                onClick={handleNextStep}
                disabled={currentStep === 3 && !isConnected}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    currentStep === 3 && !isConnected
                      ? "var(--border-color)"
                      : "var(--accent-color)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    currentStep === 3 && !isConnected
                      ? "not-allowed"
                      : "pointer",
                  opacity: currentStep === 3 && !isConnected ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {currentStep === 3 && !isConnected
                  ? "Waiting for Connection..."
                  : "Next Step →"}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--success-color)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                🚀 Start Examination
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThirdEyeSetup;