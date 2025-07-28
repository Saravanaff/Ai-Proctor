import { ScanStep } from "../types";

export const defaultScanSteps: ScanStep[] = [
  {
    id: 1,
    title: "Front Face Scan",
    instruction: "Look directly at the camera",
    description:
      "Position your face in the center and look straight ahead. Ensure good lighting.",
    icon: "👤",
  },
  {
    id: 2,
    title: "Right Side Profile",
    instruction: "Turn your head to the right",
    description: "Show your right profile to the camera",
    icon: "👤➡️",
  },
  {
    id: 3,
    title: "Left Side Profile",
    instruction: "Turn your head to the left",
    description: "Show your left profile to the camera",
    icon: "⬅️👤",
  },
];

export const overlayStyles = {
  gradient: {
    top: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
    bottom:
      "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
  },
  colors: {
    primary: "white",
    secondary: "rgba(255, 255, 255, 0.8)",
    background: "rgba(0, 0, 0, 0.7)",
  },
};
