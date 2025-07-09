import React from "react";
import Webcam from "react-webcam";
import '@/styles/WebcamFeed.module.css';
const WebcamFeed: React.FC = () => {
    const videoConstraints = {
      width: 280,
      height: 180,
      facingMode: "user",
    };
  
    return (
      <div className="webcam-container">
        <h3 className="webcam-title">
          Proctor View
        </h3>
        <Webcam
        //   audio={false}
        //   screenshotFormat="image/jpeg"
        //   videoConstraints={videoConstraints}
          className="webcam-element"
        />
      </div>
    );
  };
  
  export default WebcamFeed;