interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

const useMicrophoneDevices = () => {
  const isMicrophoneApiSupported = () => {
    return (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "enumerateDevices" in navigator.mediaDevices
    );
  };

  const filterRealMicrophones = (devices: MediaDeviceInfo[]) => {
    return devices.filter((device) => {
      if (device.kind !== "audioinput") return false;

      const label = device.label.toLowerCase();

      // Filter out virtual/monitor devices
      const virtualDevicePatterns = [
        "monitor of",
        "stereo mix",
        "wave out mix",
        "what u hear",
        "loopback",
        "virtual",
        "voicemeeter",
        "obs virtual",
        "cable output",
        "cable input",
      ];

      // Check if this is a virtual device
      const isVirtualDevice = virtualDevicePatterns.some((pattern) =>
        label.includes(pattern)
      );

      if (isVirtualDevice) {
        console.log(`Filtering out virtual device: ${device.label}`);
        return false;
      }

      return true;
    });
  };

  const removeDuplicateMicrophones = (microphones: MediaDeviceInfo[]) => {
    const uniqueMics = new Map();

    microphones.forEach((mic) => {
      const key = mic.label || mic.deviceId;
      if (!uniqueMics.has(key)) {
        uniqueMics.set(key, mic);
      } else {
        console.log(`Removing duplicate microphone: ${mic.label}`);
      }
    });

    return Array.from(uniqueMics.values());
  };

  const getMicrophoneCount = async () => {
    let micCount = 0;

    // Check if MediaDevices API is supported
    if (!isMicrophoneApiSupported()) {
      console.warn(
        "MediaDevices API is not supported in this browser/environment"
      );
      return micCount;
    }

    try {
      // Request permission first to get device labels and accurate count
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter for real microphones (not virtual/monitor devices)
      const realMicrophones = filterRealMicrophones(devices);

      // Remove duplicates
      const uniqueMicrophones = removeDuplicateMicrophones(realMicrophones);

      micCount = uniqueMicrophones.length;

      console.log(
        `Found ${micCount} real microphone(s):`,
        uniqueMicrophones.map((mic) => ({
          label: mic.label || "Unknown Microphone",
          deviceId: mic.deviceId,
        }))
      );
    } catch (err) {
      console.error("Error in getting microphone devices:", err);
      // Common errors:
      // - NotAllowedError: User denied microphone permission
      // - NotFoundError: No microphone devices found
      // - NotSupportedError: getUserMedia not supported
    }

    return micCount;
  };

  const getMicrophoneDetails = async (): Promise<MicrophoneDevice[]> => {
    if (!isMicrophoneApiSupported()) {
      return [];
    }

    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter for real microphones (not virtual/monitor devices)
      const realMicrophones = filterRealMicrophones(devices);

      // Remove duplicates
      const uniqueMicrophones = removeDuplicateMicrophones(realMicrophones);

      return uniqueMicrophones.map((mic) => ({
        deviceId: mic.deviceId,
        label: mic.label || "Unknown Microphone",
        groupId: mic.groupId,
      }));
    } catch (err) {
      console.error("Error getting microphone details:", err);
      return [];
    }
  };

  const debugAllAudioDevices = async () => {
    if (!isMicrophoneApiSupported()) {
      console.log("MediaDevices API not supported");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );

      console.log("=== ALL AUDIO INPUT DEVICES ===");
      audioInputs.forEach((device, index) => {
        console.log(`${index + 1}. ${device.label} (ID: ${device.deviceId})`);
      });

      const filtered = filterRealMicrophones(devices);
      console.log("\n=== AFTER FILTERING VIRTUAL DEVICES ===");
      filtered.forEach((device, index) => {
        console.log(`${index + 1}. ${device.label} (ID: ${device.deviceId})`);
      });

      const unique = removeDuplicateMicrophones(filtered);
      console.log("\n=== AFTER REMOVING DUPLICATES ===");
      unique.forEach((device, index) => {
        console.log(`${index + 1}. ${device.label} (ID: ${device.deviceId})`);
      });
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  return {
    getMicrophoneCount,
    getMicrophoneDetails,
    isMicrophoneApiSupported,
    filterRealMicrophones,
    removeDuplicateMicrophones,
    debugAllAudioDevices,
  };
};

export default useMicrophoneDevices;
