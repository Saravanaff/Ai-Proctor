export interface ScanStep {
  id: number;
  title: string;
  instruction: string;
  description: string;
  icon: string;
}

export interface VideoComponentProps {
  onScanComplete?: (results: ScanResult[]) => void;
  customSteps?: ScanStep[];
  scanDuration?: number;
}

export interface ScanResult {
  stepId: number;
  timestamp: Date;
  success: boolean;
}

export interface OverlayProps {
  currentStep: ScanStep;
  isScanning: boolean;
  stepNumber: number;
  totalSteps: number;
  onScan: () => void;
}

export interface VideoStreamProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoStream: MediaStream | null;
}
