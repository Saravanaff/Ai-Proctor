class CameraManager {
  private static instance: CameraManager;
  private currentStream: MediaStream | null = null;
  private isInUse: boolean = false;
  private retryAttempts: number = 0;
  private maxRetries: number = 3;

  static getInstance(): CameraManager {
    if (!CameraManager.instance) {
      CameraManager.instance = new CameraManager();
    }
    return CameraManager.instance;
  }

  async getCamera(
    constraints: MediaStreamConstraints = { video: true }
  ): Promise<MediaStream> {
    // Force release any existing streams
    await this.forceRelease();

    // Wait longer for camera to be fully released
    await new Promise((resolve) => setTimeout(resolve, 500));

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.currentStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        this.isInUse = true;
        this.retryAttempts = 0; // Reset retry counter on success
        return this.currentStream;
      } catch (error: any) {
        console.error(`Camera access attempt ${attempt + 1} failed:`, error);

        if (error.name === "NotReadableError") {
          // This specific error means camera is in use or hardware issue
          console.log(
            "NotReadableError detected, forcing complete camera release..."
          );
          await this.forceRelease();

          if (attempt < this.maxRetries) {
            // Wait progressively longer between retries
            const waitTime = 1000 * (attempt + 1);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }

    throw new Error(
      `Failed to access camera after ${this.maxRetries + 1} attempts`
    );
  }

  async forceRelease(): Promise<void> {
    // Release current stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.currentStream = null;
    }

    // Try to find and stop any other video tracks that might be active
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      // Force stop any active video elements on the page
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((video) => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      });
    } catch (error) {
      console.warn("Error during force release:", error);
    }

    this.isInUse = false;
  }

  releaseCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.currentStream = null;
    }
    this.isInUse = false;
  }

  async initialize(): Promise<void> {
    // Force clean state on initialization
    await this.forceRelease();
    console.log("Camera manager initialized");
  }

  async resetCamera(): Promise<void> {
    // Complete reset - useful when switching between components
    console.log("Resetting camera manager...");
    await this.forceRelease();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Camera manager reset complete");
  }

  isStreamActive(): boolean {
    return this.isInUse && this.currentStream !== null;
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  async debugCameraState(): Promise<void> {
    console.log("=== Camera Manager Debug Info ===");
    console.log("Is in use:", this.isInUse);
    console.log("Current stream:", this.currentStream);
    console.log("Stream active:", this.currentStream?.active);

    if (this.currentStream) {
      console.log(
        "Stream tracks:",
        this.currentStream.getTracks().map((track) => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          id: track.id,
        }))
      );
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      console.log("Available video devices:", videoDevices.length);
    } catch (error) {
      console.error("Error getting devices:", error);
    }

    const videoElements = document.querySelectorAll("video");
    console.log("Video elements on page:", videoElements.length);
    videoElements.forEach((video, index) => {
      console.log(`Video ${index}:`, {
        srcObject: !!video.srcObject,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    });
    console.log("=== End Debug Info ===");
  }

  async getDeviceInfo(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error getting device info:", error);
      return [];
    }
  }
}

export const cameraManager = CameraManager.getInstance();
