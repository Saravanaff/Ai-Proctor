import React from 'react';
import { useRouter } from 'next/router';

const EndPage: React.FC = () => {
  const router = useRouter();

  return (
    <div style={{ 
      textAlign: "center", 
      paddingTop: "50px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <h1 style={{ color: "#28a745", marginBottom: "20px" }}>✅ Exam Submitted</h1>
      <p style={{ fontSize: "18px", marginBottom: "40px" }}>Thank you for participating</p>
      
      <div style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#f8f9fa"
      }}>
        <h3 style={{ marginBottom: "20px", color: "#333" }}>📹 Screen Recording</h3>
        <p style={{ color: "#666", margin: "0 0 20px 0" }}>
          Your screen recording was automatically downloaded during the exam session.
        </p>
        <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
          Please check your downloads folder for the recording file.
        </p>
      </div>

      <div style={{ marginTop: "40px" }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: "12px 30px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default EndPage;