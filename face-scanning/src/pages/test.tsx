'use client';

import React, { useRef, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface TestPageProps {}

const TestPage: React.FC<TestPageProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Initialize socket connection
  useEffect(() => {
    const socket = io('https://localhost:3001', {
      rejectUnauthorized: false,
      transports: ['websocket'],
      auth: {
        userId: 'test-user-123'
      }
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      addLog('✅ Socket connected to backend');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      addLog('❌ Socket disconnected from backend');
    });

    socket.on('connect_error', (error) => {
      addLog(`🔥 Socket connection error: ${error.message}`);
    });

    // Listen for responses from backend
    socket.on('faceAuthRes-client', (data) => {
      addLog(`📨 Received faceAuthRes: ${JSON.stringify(data)}`);
    });

    socket.on('headPositionRes-client', (data) => {
      addLog(`📨 Received headPositionRes: ${JSON.stringify(data)}`);
    });

    socket.on('eyePositionRes-client', (data) => {
      addLog(`📨 Received eyePositionRes: ${JSON.stringify(data)}`);
    });

    socket.on('webDetectRes-client', (data) => {
      addLog(`📨 Received webDetectRes: ${JSON.stringify(data)}`);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // Open camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
        addLog('📷 Camera opened successfully');
      }
    } catch (error) {
      addLog(`❌ Failed to open camera: ${error}`);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraOpen(false);
      addLog('📷 Camera closed');
    }
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) {
      addLog('❌ No camera stream available');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          addLog(`📊 Recorded chunk: ${event.data.size} bytes`);
          
          if (socketRef.current && socketConnected) {
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const chunkData = {
                user_id: 'test-user-123',
                exam_id: 'test-exam-456',
                chunk: arrayBuffer,
                timestamp: new Date(),
                chunkSize: event.data.size,
                examSettings:{
                    third_eye_enabled: 0,
                    multiple_person_detection_enabled: 1,
                    eyeball_detection_enabled: 1,
                    object_detection_enabled:1,
                    head_direction_enabled: 1,
                    flag_notifications_enabled:1 
                }
              };
              
              socketRef.current?.emit('recorder-add-video-stream-chunk', chunkData);
              addLog(`📤 Sent chunk to backend: ${event.data.size} bytes`);
            };
            reader.readAsArrayBuffer(event.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        addLog('⏹️ Recording stopped');
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        addLog(`📁 Final video blob size: ${blob.size} bytes`);
      };

      mediaRecorder.start(1000); 
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      addLog('🔴 Recording started');
    } catch (error) {
      addLog(`❌ Failed to start recording: ${error}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const testFaceAuth = () => {
    if (socketRef.current && socketConnected) {
      const testData = {
        userId: 'test-user-123',
        examId: 'test-exam-456',
        auth: Math.random() > 0.5,
        timestamp: new Date()
      };
      socketRef.current.emit('faceAuthRes', testData);
      addLog(`📤 Sent test faceAuthRes: ${JSON.stringify(testData)}`);
    }
  };

  const testHeadPosition = () => {
    if (socketRef.current && socketConnected) {
      const positions = ['forward', 'left', 'right', 'up', 'down'];
      const testData = {
        userId: 'test-user-123',
        examId: 'test-exam-456',
        data: {
          headPos: positions[Math.floor(Math.random() * positions.length)]
        },
        timestamp: new Date()
      };
      socketRef.current.emit('headPositionRes', testData);
      addLog(`📤 Sent test headPositionRes: ${JSON.stringify(testData)}`);
    }
  };

  const testEyePosition = () => {
    if (socketRef.current && socketConnected) {
      const positions = ['center', 'left', 'right', 'up', 'down'];
      const testData = {
        userId: 'test-user-123',
        examId: 'test-exam-456',
        data: {
          leftEye: positions[Math.floor(Math.random() * positions.length)],
          rightEye: positions[Math.floor(Math.random() * positions.length)]
        },
        timestamp: new Date()
      };
      socketRef.current.emit('eyePositionRes', testData);
      addLog(`📤 Sent test eyePositionRes: ${JSON.stringify(testData)}`);
    }
  };

  const testWebDetect = () => {
    if (socketRef.current && socketConnected) {
      const testData = {
        userId: 'test-user-123',
        examId: 'test-exam-456',
        data: {
          Mobile: Math.random() > 0.7 ? 1 : 0,
          Person: Math.floor(Math.random() * 3)
        },
        timestamp: new Date()
      };
      socketRef.current.emit('webDetectRes', testData);
      addLog(`📤 Sent test webDetectRes: ${JSON.stringify(testData)}`);
    }
  };

  const startExam = () => {
    if (socketRef.current && socketConnected) {
      const examData = {
        exam_id: 'test-exam-456',
        user_id: 'test-user-123'
      };
      socketRef.current.emit('start-exam', examData);
      addLog('🎯 Started exam recording');
    }
  };

  const endExam = () => {
    if (socketRef.current && socketConnected) {
      const examData = {
        exam_id: 'test-exam-456',
        user_id: 'test-user-123'
      };
      socketRef.current.emit('end-exam', examData);
      addLog('🏁 Ended exam recording');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Camera & Socket Test Page</h1>
      
      {/* Status indicators */}
      <div className="flex gap-4 mb-6">
        <div className={`px-3 py-1 rounded ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Socket: {socketConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className={`px-3 py-1 rounded ${isCameraOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          Camera: {isCameraOpen ? 'Open' : 'Closed'}
        </div>
        <div className={`px-3 py-1 rounded ${isRecording ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
          Recording: {isRecording ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Camera Preview</h2>
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full border border-gray-300 rounded bg-black"
            style={{ maxHeight: '400px' }}
          />
          
          {/* Camera controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openCamera}
              disabled={isCameraOpen}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              Open Camera
            </button>
            <button
              onClick={closeCamera}
              disabled={!isCameraOpen}
              className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
            >
              Close Camera
            </button>
          </div>

          {/* Recording controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={startRecording}
              disabled={!isCameraOpen || isRecording}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-400"
            >
              Stop Recording
            </button>
          </div>

          {/* Exam controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={startExam}
              disabled={!socketConnected}
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-400"
            >
              Start Exam
            </button>
            <button
              onClick={endExam}
              disabled={!socketConnected}
              className="px-4 py-2 bg-purple-700 text-white rounded disabled:bg-gray-400"
            >
              End Exam
            </button>
          </div>
        </div>

        {/* Test controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Socket Emissions</h2>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={testFaceAuth}
              disabled={!socketConnected}
              className="px-4 py-2 bg-indigo-500 text-white rounded disabled:bg-gray-400"
            >
              Test Face Auth
            </button>
            <button
              onClick={testHeadPosition}
              disabled={!socketConnected}
              className="px-4 py-2 bg-teal-500 text-white rounded disabled:bg-gray-400"
            >
              Test Head Position
            </button>
            <button
              onClick={testEyePosition}
              disabled={!socketConnected}
              className="px-4 py-2 bg-cyan-500 text-white rounded disabled:bg-gray-400"
            >
              Test Eye Position
            </button>
            <button
              onClick={testWebDetect}
              disabled={!socketConnected}
              className="px-4 py-2 bg-amber-500 text-white rounded disabled:bg-gray-400"
            >
              Test Web Detect
            </button>
          </div>
        </div>
      </div>

      {/* Logs section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Activity Logs</h2>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
          >
            Clear Logs
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPage;