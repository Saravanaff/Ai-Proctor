# Face Scanning Video Component

A modular, customizable React component for face scanning with step-by-step guidance.

## 🏗️ Modular Architecture

### 📁 Project Structure

```
src/
├── components/           # UI Components
│   ├── VideoComponent.tsx      # Main container component
│   ├── VideoStream.tsx         # Video display component
│   ├── FaceDetectionOverlay.tsx # Face detection guide
│   ├── HeaderOverlay.tsx       # Top instruction display
│   ├── FooterOverlay.tsx       # Bottom guidance text
│   ├── StepCounter.tsx         # Step progress indicator
│   ├── ScanButton.tsx          # Scan/Next button
│   ├── LoadingIndicator.tsx    # Loading state display
│   └── index.ts               # Component exports
├── hooks/               # Custom React hooks
│   ├── useVideoStream.ts      # Camera access logic
│   └── useScanFlow.ts         # Scan step management
├── types/               # TypeScript definitions
│   └── index.ts              # All type definitions
├── constants/           # Configuration
│   └── scanConfig.ts         # Default steps and styles
└── demo/               # Usage examples
    └── DemoApp.tsx           # Example implementation
```

## 🚀 Quick Start

### Basic Usage

```tsx
import VideoComponent from "./components/VideoComponent";

function App() {
  const handleScanComplete = (results) => {
    console.log("Scan results:", results);
  };

  return <VideoComponent onScanComplete={handleScanComplete} />;
}
```

### Custom Configuration

```tsx
import VideoComponent from "./components/VideoComponent";
import { ScanStep } from "./types";

const customSteps: ScanStep[] = [
  {
    id: 1,
    title: "Custom Step",
    instruction: "Your instruction here",
    description: "Additional guidance",
    icon: "🎯",
  },
];

function App() {
  return (
    <VideoComponent
      customSteps={customSteps}
      scanDuration={3000}
      onScanComplete={(results) => console.log(results)}
    />
  );
}
```

## 📋 API Reference

### VideoComponent Props

| Prop             | Type                              | Default            | Description                           |
| ---------------- | --------------------------------- | ------------------ | ------------------------------------- |
| `onScanComplete` | `(results: ScanResult[]) => void` | -                  | Callback when all steps complete      |
| `customSteps`    | `ScanStep[]`                      | `defaultScanSteps` | Custom scan step configuration        |
| `scanDuration`   | `number`                          | `2000`             | Duration of each scan in milliseconds |

### Types

#### ScanStep

```tsx
interface ScanStep {
  id: number;
  title: string;
  instruction: string;
  description: string;
  icon: string;
}
```

#### ScanResult

```tsx
interface ScanResult {
  stepId: number;
  timestamp: Date;
  success: boolean;
}
```

## 🎨 Customization

### Custom Scan Steps

Create your own scan flow by defining custom steps:

```tsx
const mySteps: ScanStep[] = [
  {
    id: 1,
    title: "Face Verification",
    instruction: "Look at the camera",
    description: "Center your face in the oval",
    icon: "👤",
  },
  // Add more steps...
];
```

### Styling

Modify styles in `constants/scanConfig.ts`:

```tsx
export const overlayStyles = {
  gradient: {
    top: "your-gradient-here",
    bottom: "your-gradient-here",
  },
  colors: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.8)",
    background: "rgba(0, 0, 0, 0.7)",
  },
};
```

## 🔧 Hooks

### useVideoStream

Manages camera access and video stream:

```tsx
const { videoRef, videoStream, isLoading, error } = useVideoStream();
```

### useScanFlow

Handles scan step progression:

```tsx
const { currentStep, isScanning, scanResults, handleScan, currentStepData } =
  useScanFlow(steps, scanDuration);
```

## 🧩 Individual Components

All components can be used independently:

```tsx
import {
  VideoStream,
  FaceDetectionOverlay,
  HeaderOverlay,
  ScanButton,
} from "./components";

// Use components individually
<HeaderOverlay icon="👤" title="Scan Face" instruction="Look at camera" />;
```

## 📱 Features

- ✅ **Modular Architecture** - Use components independently
- ✅ **TypeScript Support** - Full type safety
- ✅ **Customizable Steps** - Define your own scan flow
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Camera Management** - Automatic camera access and cleanup
- ✅ **Error Handling** - Graceful error states
- ✅ **Loading States** - User-friendly loading indicators
- ✅ **Progress Tracking** - Visual step progression
- ✅ **Mirror Effect** - Natural selfie view

## 🎯 Benefits of Modular Design

1. **Reusability** - Use components in other projects
2. **Maintainability** - Easy to update individual parts
3. **Testability** - Test components in isolation
4. **Customization** - Override specific components
5. **Bundle Size** - Import only what you need
