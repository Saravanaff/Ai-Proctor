import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import QRCode from "qrcode";
import { getUserId } from "@/constants/AuthStore";
import io from "socket.io-client";
import styles from "../../styles/ThirdEyeSetup.module.css";

// Bright theme variables (professional white theme)
const brightThemeVars: any = {
  "--page-bg": "#ffffff",
  "--card-bg": "#ffffff",
  "--secondary-bg": "#f8fafc",
  "--border-color": "#e5e7eb",
  "--shadow": "rgba(15, 23, 42, 0.08)",
  "--text-primary": "#0f172a",
  "--text-secondary": "#475569",
  "--accent-color": "#7c3aed",
  "--success-color": "#10b981",
  "--success-bg": "rgba(16,185,129,0.08)",
  "--warning-color": "#f59e0b",
  "--error-color": "#ef4444",
  "--info-color": "#3b82f6",
  "--info-bg": "rgba(59,130,246,0.08)",
};

const ThirdEyeSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [socket, setSocket] = useState<any>(null);
  const [userId, setUserId] = useState("");
  const router = useRouter();

  const steps = [
    {
      id: 1,
      title: "Position Your Mobile Device",
      description: "Place your mobile phone to the right side of your laptop at arm's length distance",
      icon: "📱"
    },
    {
      id: 2,
      title: "Ensure Proper Distance",
      description: "Keep the mobile device 2-3 feet away from your sitting position",
      icon: "📏"
    },
    {
      id: 3,
      title: "Check Camera View",
      description: "Make sure the mobile camera has a clear side view of your face and upper body",
      icon: "📸"
    },
    {
      id: 4,
      title: "Test Connection",
      description: "Verify that the third eye monitoring is working properly",
      icon: "🔗"
    }
  ];

  useEffect(() => {
    const uid = getUserId() || "unknown";
    setUserId(uid);

    const generateQRCode = async () => {
      const thirdEyeUrl = `https://172.16.101.167:3002/mobile`;
      try {
        const qrUrl = await QRCode.toDataURL(thirdEyeUrl,{
          width: 256,
          margin: 2,
          color: {
            dark: '#7c3aed',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQRCode();

    // Initialize WebSocket connection to listen for mobile connection
    const socketConnection = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002', {
      transports: ['websocket'],
    });

    socketConnection.on('connect', () => {
      console.log('Setup page connected to backend');
      socketConnection.emit('register-third-eye-setup', { userId: uid });
    });

    // Listen for mobile connection acknowledgment
    socketConnection.on('mobile-connected', (data: any) => {
      console.log('Mobile device connected:', data);
      setIsConnected(true);
    });

    socketConnection.on('disconnect', () => {
      console.log('Setup page disconnected from backend');
      setIsConnected(false);
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    router.push("/exam");
  };

  return (
    <div
      style={{
        ...brightThemeVars,
        background: "var(--page-bg)",
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>👁️</span>
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

        <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
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
                    background: currentStep >= step.id ? "var(--accent-color)" : "var(--secondary-bg)",
                    color: currentStep >= step.id ? "white" : "var(--text-secondary)",
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
                      background: currentStep > step.id ? "var(--accent-color)" : "var(--border-color)",
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
              <div style={{ display: "flex", justifyContent: "center", gap: 32, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>💻</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Your Laptop</div>
                </div>
                <div style={{ fontSize: 24 }}>➡️</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Mobile Device</div>
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
                <h4 style={{ color: "var(--text-primary)", fontSize: 14, margin: "0 0 8px 0" }}>
                  📍 Positioning Tips:
                </h4>
                <ul style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0, paddingLeft: 20 }}>
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
              <h4 style={{ color: "var(--text-primary)", fontSize: 16, marginBottom: 16 }}>
                📱 Scan QR Code with Your Mobile Device
              </h4>
              
              {qrCodeUrl ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Third Eye QR Code"
                    style={{
                      border: "4px solid white",
                      borderRadius: 12,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                    }}
                  />
                  <div
                    style={{
                      background: "var(--info-bg)",
                      border: "1px solid var(--info-color)",
                      borderRadius: 8,
                      padding: 12,
                      maxWidth: 300,
                    }}
                  >
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>
                      Open your mobile camera and scan this QR code to connect your device as the third eye monitor
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
                    Generating QR code...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Connection Status for Step 4 */}
          {currentStep === 4 && (
            <div
              style={{
                background: isConnected ? "var(--success-bg)" : "var(--warning-color)",
                border: `1px solid ${isConnected ? "var(--success-color)" : "var(--warning-color)"}`,
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              {isConnected ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <div style={{ color: "var(--success-color)", fontSize: 16, fontWeight: 600 }}>
                    Third Eye Connected Successfully!
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 8 }}>
                    Your mobile device is ready for exam monitoring
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: "var(--card-bg)",
                      borderRadius: 8,
                      border: "1px solid var(--success-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ color: "var(--success-color)"}}>🔗</span>
                      <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 500 }}>
                        Device ID: {userId}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                  <div style={{ color: "white", fontSize: 16, fontWeight: 600 }}>
                    Waiting for Mobile Connection...
                  </div>
                  <div style={{ color: "white", fontSize: 14, marginTop: 8, opacity: 0.9 }}>
                    Please scan the QR code with your mobile device
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ color: "white" }}>📱</span>
                      <span style={{ color: "white", fontSize: 12 }}>
                        Waiting for: {userId}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent-color)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!isConnected}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: isConnected ? "var(--success-color)" : "var(--border-color)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isConnected ? "pointer" : "not-allowed",
                  opacity: isConnected ? 1 : 0.6,
                  transition: "all 0.2s ease",
                }}
              >
                🚀 Start Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThirdEyeSetup;
