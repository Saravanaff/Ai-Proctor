import React, { useEffect, useRef } from "react";
import { useAudioStream } from "../hooks/useAudioStream";
import io from "socket.io-client";

const AudioStreamSender = () => {
  const { audioStream } = useAudioStream();
  const socketRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (!audioStream) return;

    const socket = io("http://localhost:3001"); 
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(" Connected to backend socket");
      socket.emit("register-browser-audio");
    });

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(audioStream);

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const float32Buffer = new Float32Array(input.length);
      float32Buffer.set(input);
      socket.emit("process-audio", {
        buffer: float32Buffer.buffer,
      });
    };

    source.connect(processor);
    processor.connect(audioContext.destination); 
    processorRef.current = processor;
    return () => {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      socket.disconnect();
      audioContext.close();
    };
  }, [audioStream]);

  return null; 
};
export default AudioStreamSender;
