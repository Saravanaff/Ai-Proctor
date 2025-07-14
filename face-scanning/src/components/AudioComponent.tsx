import React, { useEffect, useRef } from "react";
import { useAudioStream } from "../hooks/useAudioStream";
import io from "socket.io-client";

const AudioStreamSender = () => {
  const { audioStream } = useAudioStream();
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioStream) return;
     console.log("🔍 Audio track settings:", audioStream.getAudioTracks()[0].getSettings());
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to backend socket");
      socket.emit("register-browser-audio");
    });

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(audioStream);

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);

      // Copy and send as ArrayBuffer
      const float32Array = new Float32Array(input);
      socket.emit("process-audio", {
        buffer: float32Array.buffer, // Note: This sends raw PCM float32 buffer
      });
    };

    source.connect(processor);
    processor.connect(audioContext.destination); // Optional: remove this to avoid playback

    processorRef.current = processor;

    return () => {
      console.log("🔌 Cleaning up audio stream and socket");

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }

      source.disconnect();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      socket.disconnect();
    };
  }, [audioStream]);

  return null;
};

export default AudioStreamSender;
