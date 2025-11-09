
const {io}=require('socket.io-client');
const fs = require('fs');
const path = require('path');

const SERVER_URL = "https://localhost:3003";   // change to your server port
const USERS = 1000;                              // total simulated users
const CHUNK_SIZE_KB = 64;                      // KB per chunk (realistic chunk size)
const INTERVAL_MS = 10;                       // send rate per chunk (100ms = 10 chunks/sec)
const VIDEO_FILE = path.join(__dirname, 'sample.mp4'); // your sample video

function simulateUser(userIndex) {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    rejectUnauthorized: false, // allow self-signed cert
  });

  const user_id = `user-${userIndex}`;
  const exam_id = "exam-1";
  const category = "webcam";
  
  let chunkCount = 0;
  let totalBytesSent = 0;

  socket.on("connect", () => {
    console.log(`✅ [${user_id}] CONNECTED`);

    let videoBuffer;
    try {
      videoBuffer = fs.readFileSync(VIDEO_FILE);
      console.log(`📹 [${user_id}] Loaded video file: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (err) {
      console.error(`❌ [${user_id}] Failed to read video file:`, err.message);
      socket.close();
      return;
    }

    socket.emit("start-stream-recording", {
      user_id,
      exam_id,
      category,
    });

    const chunkSize = CHUNK_SIZE_KB * 1024;
    let offset = 0;

    const interval = setInterval(() => {
      // Calculate chunk to send
      const end = Math.min(offset + chunkSize, videoBuffer.length);
      const chunk = videoBuffer.slice(offset, end);
      
      if (chunk.length === 0) {
        // Video finished, loop back to start
        offset = 0;
        console.log(`🔄 [${user_id}] Looping video...`);
        return;
      }

      socket.emit("add-video-stream-chunk", {
        user_id,
        exam_id,
        category,
        chunk: chunk,
      });

      chunkCount++;
      totalBytesSent += chunk.length;
      offset += chunk.length;
      
      if (chunkCount % 20 === 0) {
        console.log(
          `📦 [${user_id}] Sent ${chunkCount} chunks | ` +
          `${(totalBytesSent / 1024 / 1024).toFixed(2)} MB total | ` +
          `Progress: ${((offset / videoBuffer.length) * 100).toFixed(1)}%`
        );
      }
    }, INTERVAL_MS);

    const maxDuration = Math.max(
      (videoBuffer.length / (CHUNK_SIZE_KB * 1024)) * INTERVAL_MS * 1.5,
      15000 // minimum 15 seconds
    );

    setTimeout(() => {
      clearInterval(interval);

      socket.emit("stop-stream-recording", {
        user_id,
        exam_id,
        category,
      });

      console.log(
        `🛑 [${user_id}] STOP RECORDING | ` +
        `Total: ${chunkCount} chunks, ${(totalBytesSent / 1024 / 1024).toFixed(2)} MB`
      );

      setTimeout(() => socket.close(), 2000);
    }, maxDuration);
  });

  socket.on("disconnect", () => {
    console.log(`❌ [${user_id}] DISCONNECTED`);
  });
  
  socket.on("connect_error", (err) => {
    console.error(`❌ [${user_id}] CONNECTION ERROR:`, err.message);
  });
}

if (!fs.existsSync(VIDEO_FILE)) {
  console.error(`❌ Video file not found: ${VIDEO_FILE}`);
  console.error('Please ensure sample.mp4 exists in the src directory');
  process.exit(1);
}

for (let i = 0; i < USERS; i++) {
  setTimeout(() => simulateUser(i), i * 100); // stagger start (300ms apart)
}

console.log(`🚀 Starting stress test with ${USERS} users...`);
console.log(`📊 Config: ${CHUNK_SIZE_KB}KB chunks, ${INTERVAL_MS}ms interval`);
console.log(`📹 Using video file: ${VIDEO_FILE}`);

