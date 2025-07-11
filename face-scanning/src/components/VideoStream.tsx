import React from "react";

interface VideoStreamProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const VideoStream: any = ({ videoRef }:any) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
        autoPlay
        playsInline
        muted
      />
    </div>
  );
};

export default VideoStream;
