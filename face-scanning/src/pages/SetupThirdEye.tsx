import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import QRCode from "qrcode";
import { getUserEmail, getUserId, getGlobalName, getExamId } from "@/constants/AuthStore";
// import { useTheme } from "@/contexts/ThemeContext"; // Removed - Light theme only
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
  // const { theme } = useTheme(); // Removed - Light theme only

  // Remove the spinner animation effect since we'll use CSS

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

  // Add SEO metadata
  const pageTitle = `Third Eye Setup - Step ${currentStep} of ${steps.length}`;
  const pageDescription =
    "Set up your mobile device for comprehensive exam monitoring with our Third Eye system.";

  useEffect(() => {
    const generateQRCode = async () => {
      const redirect = encodeURIComponent("/mobile");
      const name = encodeURIComponent(userName);
      const email = encodeURIComponent(userEmail);
      const examId = encodeURIComponent(
        getExamId()
      );
      const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
      const thirdEyeUrl = `${clientUrl}?userId=${userId}&name=${name}&email=${email}&redirect=${redirect}&examId=${examId}`;
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
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/setup-third-eye" />
      </Head>

      <main className={`${styles.container} theme-transition`}>
        <article className={`${styles.setupCard} card-theme`}>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Third Eye Setup</h1>
              <p className={styles.subtitle}>
                Set up your mobile device for comprehensive exam monitoring
              </p>
            </div>
          </header>

          <section
            className={styles.progressSection}
            aria-label="Setup progress"
          >
            <div className={styles.progressContainer}>
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={styles.progressStep}
                  aria-current={currentStep === step.id ? "step" : undefined}
                >
                  <div
                    className={`${styles.stepIndicator} ${currentStep >= step.id ? styles.stepCompleted : ""
                      }`}
                    aria-label={`Step ${step.id}: ${step.title}`}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`${styles.stepConnector} ${currentStep > step.id ? styles.connectorCompleted : ""
                        }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className={styles.stepCounter} aria-live="polite">
              Step {currentStep} of {steps.length}
            </div>
          </section>

          <section
            className={styles.mainContent}
            aria-label="Setup step content"
          >
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                {steps[currentStep - 1]?.title}
              </h2>
              <p className={styles.stepDescription}>
                {steps[currentStep - 1]?.description}
              </p>
            </div>

            {currentStep === 1 && (
              <div className={styles.infoCard}>
                <div className={styles.setupGuide}>
                  <div className={styles.deviceFlow}>
                    <div className={styles.deviceSetup}>
                      <div className={styles.device}>💻 Laptop</div>
                      <div className={styles.distance}>2-3 feet</div>
                    </div>
                    <div className={styles.connector}></div>
                    <div className={styles.deviceSetup}>
                      <div className={styles.device}>📱 Mobile</div>
                      <div className={styles.position}>Right Side</div>
                    </div>
                  </div>

                  <div className={styles.setupInstructions}>
                    <h3 className={styles.instructionsTitle}>
                      Setup Requirements
                    </h3>
                    <div className={styles.requirementsList}>
                      <div className={styles.requirement}>
                        <span className={styles.requirementIcon}>📍</span>
                        <div className={styles.requirementText}>
                          <strong>Position:</strong> Place mobile to your right
                          side
                        </div>
                      </div>
                      <div className={styles.requirement}>
                        <span className={styles.requirementIcon}>📏</span>
                        <div className={styles.requirementText}>
                          <strong>Distance:</strong> Maintain 2-3 feet from your
                          seat
                        </div>
                      </div>
                      <div className={styles.requirement}>
                        <span className={styles.requirementIcon}>📐</span>
                        <div className={styles.requirementText}>
                          <strong>Angle:</strong> 45-degree side view of your
                          profile
                        </div>
                      </div>
                      <div className={styles.requirement}>
                        <span className={styles.requirementIcon}>🔧</span>
                        <div className={styles.requirementText}>
                          <strong>Stability:</strong> Use a stand or stable
                          surface
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.importantNote}>
                    <div className={styles.noteIcon}>⚠️</div>
                    <div className={styles.noteText}>
                      <strong>Important:</strong> The mobile camera should
                      capture your side profile and workspace clearly for
                      effective monitoring.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className={styles.qrSection}>
                {qrCodeUrl ? (
                  <div className={styles.qrContainer}>
                    <div className={styles.qrCode}>
                      <img
                        src={qrCodeUrl}
                        alt="Third Eye QR Code for mobile device connection"
                        className={styles.qrImage}
                      />
                    </div>

                    <div
                      className={styles.connectionStatus}
                      role="status"
                      aria-live="polite"
                    >
                      {isConnected ? (
                        <div className={styles.statusConnected}>
                          <div className={styles.statusText}>Connected</div>
                        </div>
                      ) : (
                        <div className={styles.statusWaiting}>
                          <div className={styles.spinner} aria-hidden="true" />
                          <div className={styles.statusText}>Connecting...</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.qrLoading}>
                    <div className={styles.loadingText}>
                      Generating QR code...
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className={styles.completionCard}>
                <div className={styles.completionTitle}>Ready to Begin</div>
                <div className={styles.completionDescription}>
                  Third eye monitoring system is connected and ready.
                </div>
                <div className={styles.connectionInfo}>
                  <div className={styles.connectionItem}>
                    <span>Connected</span>
                    <span className={styles.deviceId}>
                      ID: {userId.slice(-6)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <footer className={styles.footer}>
            <button
              onClick={handlePreviousStep}
              disabled={currentStep === 1}
              className={`${styles.button} ${styles.buttonSecondary}`}
              aria-label="Go to previous step"
            >
              Back
            </button>

            <div className={styles.actionButtons}>
              {currentStep < steps.length ? (
                <button
                  onClick={handleNextStep}
                  disabled={currentStep === 3 && !isConnected}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  aria-label={
                    currentStep === 3 && !isConnected
                      ? "Waiting for mobile device connection"
                      : "Proceed to next step"
                  }
                >
                  {currentStep === 3 && !isConnected ? "Waiting..." : "Next"}
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  aria-label="Start examination"
                >
                  Start Exam
                </button>
              )}
            </div>
          </footer>
        </article>
      </main>
    </>
  );
};

export default ThirdEyeSetup;
