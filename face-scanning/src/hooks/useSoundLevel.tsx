import { useEffect, useState } from 'react';
import { soundLimit } from '@/constants/soundConfig';

const useSoundLevel = () => {

    let mediaStream;

    const [isSoundDetected, setIsSoundDetected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    useEffect(() => {
    const initSound = async () => {

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      if (!mediaStream) return;

      const audioContext = new (
        window.AudioContext ||
        (window as any).webkitAudioContext
      )();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const detectSound = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength; 

        setAudioLevel(avg);
        setIsSoundDetected(avg > soundLimit); 

        requestAnimationFrame(detectSound);
      };

      detectSound();

      return () => {
        audioContext.close();
      };
    }
    initSound();
  }, [mediaStream]);

  return { isSoundDetected, audioLevel };
};


export default useSoundLevel;