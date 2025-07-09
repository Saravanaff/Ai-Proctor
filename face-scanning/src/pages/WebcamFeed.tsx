import React from "react";
import Webcam from "react-webcam";

// const WebcamFeed: React.FC = () => {
//   const videoConstraints = {
//     width: 280,
//     height: 180,
//     facingMode: "user",
//   };

//   const styles = {
//     container: {
//       border: "4px solid #60a5fa",
//       backgroundColor: "white",
//       borderRadius: "12px",
//       boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
//       padding: "16px",
//     },
//     title: {
//       textAlign: "center" as const,
//       fontWeight: "bold" as const,
//       color: "#1d4ed8",
//       marginBottom: "8px",
//     },
//     webcam: {
//       borderRadius: "8px",
//       width: "100%",
//     },
//   };

//   return (
//     <div style={styles.container}>
//       <h3 style={styles.title}>Proctor View</h3>
//       <Webcam
//         audio={false}
//         screenshotFormat="image/jpeg"
//         videoConstraints={videoConstraints}
//         style={styles.webcam}
//       />
//     </div>
//   );
// };

// export default WebcamFeed;

const WebcamFeed: React.FC = () => {
  const videoConstraints = {
    width: 280,
    height: 180,
    facingMode: "user",
  };

  return (
    <div className="webcam-container">
      <h3 className="webcam-title">Proctor View</h3>
      <Webcam
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="webcam-element"
      />

      <style jsx>{`
        .webcam-container {
          border: 4px solid #60a5fa;
          background: white;
          border-radius: 12px;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
          padding: 16px;
        }

        .webcam-title {
          text-align: center;
          font-weight: bold;
          color: #1d4ed8;
          margin-bottom: 8px;
        }

        .webcam-element {
          border-radius: 8px;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default WebcamFeed;
