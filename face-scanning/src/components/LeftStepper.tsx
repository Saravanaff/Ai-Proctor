import React from 'react'

type LeftStepperProps = {
    faceDirectionSequence : React.RefObject<String[]>;
    stage: React.RefObject<number>;
}

const LeftStepper: React.FC<LeftStepperProps> = ({ faceDirectionSequence, stage }) => {
  return (
    <div
    style={{
        position: "absolute",
        top: 60,
        left: 16,
        zIndex: 60,
        background: "rgba(17,24,39,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 12,
        width: 260,
        color: "#e5e7eb",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    }}
    >
    <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Verification Steps</div>
    {["Face Forward", "Turn Right", "Turn Left"].map((label, idx) => {
        const stepNo = idx + 1;
        const state = faceDirectionSequence.current.length < stage.current ? "done" : stepNo === stage.current ? "current" : "pending";
        const color = state === "done" ? "#22c55e" : state === "current" ? "#0ea5e9" : "#4b5563";
        return (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, background: state === "current" ? "rgba(14,165,233,0.12)" : "transparent" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{state === "done" ? "✓" : stepNo}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{stepNo === 1 ? "Look directly at the camera" : stepNo === 2 ? "Turn your head to the right" : "Turn your head to the left"}</span>
            </div>
        </div>
        );
    })}
    </div>
  )
}

export default LeftStepper