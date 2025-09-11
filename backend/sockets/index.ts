import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from "http";
import {
  getRtpCapabilities,
  createTransport,
  connectTransport,
  produce,
} from "../mediasoupServer";
import dotenv from "dotenv";
import path from "path";
import { io as ioClient } from "socket.io-client";
import { getExamScore, addScore, calculateExamScore } from "../utils/calculate";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
const ffmpegStatic = require("ffmpeg-static");

dotenv.config();

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const storageServerUrl = process.env.STORAGE_SERVER_URL;

export function initSocket(server: HttpServer) {
  const io = new SocketIOServer(server, {
    transports: ["websocket"],
    cors: { origin: "*" },
  });

  const userToSocket = new Map<string, string>();
  const socketToUser = new Map<string, string>();
  const isCapture = new Set<string>();
  const modelSocket = new Map<string, string>();
  const socketToModel = new Map<string, string>();
  const authCounter = new Map<string, number>();
  const frameCounter = new Map<string, number>();
  const authVerified = new Map<string, boolean>();
  const webDetectFrameCounter = new Map<string, number>();
  
  const videoBuffers = new Map<string, Buffer[]>();
  const frameCounters = new Map<string, number>();

  async function validateVideoFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.log("Video validation failed:", err.message);
          resolve(false);
        } else if (!metadata.streams || metadata.streams.length === 0) {
          console.log("No video streams found");
          resolve(false);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          if (!videoStream) {
            console.log("No video stream found");
            resolve(false);
          } else {
            console.log("Video validation successful");
            resolve(true);
          }
        }
      });
    });
  }

async function processVideoChunk(data: any, userId: string, examSettings: any) {
  return new Promise<void>((resolve, reject) => {
    // Validate chunk data
    if (!data.chunk || data.chunk.length === 0) {
      console.error('Invalid video chunk: empty or null data');
      reject(new Error('Invalid video chunk data'));
      return;
    }
    
    // Validate that chunk is a proper Buffer
    if (!Buffer.isBuffer(data.chunk)) {
      console.error('Video chunk is not a Buffer');
      reject(new Error('Invalid video chunk format'));
      return;
    }
    
    console.log(`Processing video chunk: ${data.chunk.length} bytes from user ${userId}`);
    
    // Initialize buffer for this user if it doesn't exist
    if (!videoBuffers.has(userId)) {
      videoBuffers.set(userId, []);
      frameCounters.set(userId, 0);
    }
    
    // Add chunk to buffer
    const userBuffers = videoBuffers.get(userId)!;
    userBuffers.push(data.chunk);
    
    // Increment frame counter
    const frameCount = (frameCounters.get(userId) || 0) + 1;
    frameCounters.set(userId, frameCount);
    
    // Much more aggressive processing - process every 5 chunks or 512KB
    const totalBufferSize = userBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const shouldProcess = frameCount % 5 === 0 || totalBufferSize > 512 * 1024; // 5 chunks or 512KB threshold
    
    if (shouldProcess && userBuffers.length > 0) {
      try {
        // Combine all buffered chunks
        const combinedBuffer = Buffer.concat(userBuffers);
        console.log(`Fast processing video buffer: ${combinedBuffer.length} bytes for user ${userId}`);
        
        // Skip WebM signature check and go directly to fast processing
        processVideoDataUltraFast(combinedBuffer, data, examSettings);
        
        // Clear the buffer immediately
        videoBuffers.set(userId, []);
        resolve();
        
      } catch (error) {
        console.error('Error processing video buffer:', error);
        reject(error);
      }
    } else {
      // Just accumulate the chunk, don't process yet
      console.log(`Accumulated chunk ${frameCount} for user ${userId}, buffer size: ${totalBufferSize} bytes`);
      resolve();
    }
  });
}

function processVideoDataUltraFast(videoBuffer: Buffer, originalData: any, examSettings: any) {
  console.log('Ultra-fast video processing - skipping FFmpeg entirely');
  
  try {
    // Send raw data immediately without any processing
    const frameData = {
      user_id: originalData.user_id || originalData.userId,
      exam_id: originalData.exam_id || originalData.examId,
      settings: originalData.settings || originalData.examSettings,
      examSettings: originalData.examSettings || originalData.settings,
      timestamp: originalData.timestamps || Date.now(),
      buffer: videoBuffer.toString('base64'),
      isRawVideo: true,
      dataSize: videoBuffer.length
    };
    
    // Send immediately to AI models
    if (examSettings) {
      console.log(`Ultra-fast: Sending raw data to AI models: ${videoBuffer.length} bytes`);
      processFrameForAIModels(frameData, examSettings);
    }
    
  } catch (error) {
    console.error('Ultra-fast processing failed:', error);
  }
}

function checkForWebMSignature(buffer: Buffer): boolean {
  // Check for EBML header (WebM/Matroska signature)
  // WebM files start with 0x1A 0x45 0xDF 0xA3
  if (buffer.length < 4) return false;
  
  // Look for WebM signature in the first few bytes
  for (let i = 0; i < Math.min(buffer.length - 4, 100); i++) {
    if (buffer[i] === 0x1A && buffer[i + 1] === 0x45 && 
        buffer[i + 2] === 0xDF && buffer[i + 3] === 0xA3) {
      return true;
    }
  }
  
  return false;
}

function processRawVideoData(videoBuffer: Buffer, originalData: any, examSettings: any) {
  console.log('Processing raw video data directly for AI analysis');
  
  try {
    // Try to extract a JPG frame from raw video data using a more aggressive approach
    const userId = originalData.user_id || originalData.userId;
    const tempVideoPath = path.join('/tmp', `raw_video_${userId}_${Date.now()}.webm`);
    const tempJpgPath = path.join('/tmp', `raw_frame_${userId}_${Date.now()}.jpg`);
    
    // Write raw data to temp file
    fs.writeFileSync(tempVideoPath, videoBuffer);
    
    // Try to extract JPG with very aggressive settings
    const ffmpegCommand = ffmpeg(tempVideoPath)
      .inputOptions([
        '-f', 'webm',                 // Force webm format
        '-err_detect', 'ignore_err',
        '-fflags', '+igndts+ignidx',
        '-analyzeduration', '100000', // Very fast analysis
        '-probesize', '100000'
      ])
      .outputOptions([
        '-vf', 'scale=320:240',       // Small resolution for speed
        '-q:v', '8',                  // Lower quality for speed
        '-pix_fmt', 'yuvj420p',
        '-f', 'image2'
      ])
      .frames(1)
      .on('end', () => {
        console.log('Successfully extracted JPG from raw video data');
        
        try {
          if (fs.existsSync(tempJpgPath)) {
            const jpgBuffer = fs.readFileSync(tempJpgPath);
            
            const frameData = {
              user_id: originalData.user_id || originalData.userId,
              exam_id: originalData.exam_id || originalData.examId,
              settings: originalData.settings || originalData.examSettings,
              examSettings: originalData.examSettings || originalData.settings,
              timestamp: originalData.timestamps || Date.now(),
              buffer: jpgBuffer.toString('base64'), // Send optimized JPG data
              isRawVideo: false, // Now it's a processed JPG
              dataSize: jpgBuffer.length
            };
            
            if (examSettings) {
              console.log(`Sending optimized JPG to AI models: ${jpgBuffer.length} bytes`);
              processFrameForAIModels(frameData, examSettings);
            }
            
            // Clean up
            fs.unlinkSync(tempJpgPath);
          }
        } catch (error) {
          console.error('Error processing extracted JPG:', error);
        }
        
        // Clean up temp video file
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
      })
      .on('error', (err) => {
        console.log('Failed to extract JPG from raw data, sending raw data');
        
        // Fallback to sending raw data if JPG extraction fails
        const frameData = {
          user_id: originalData.user_id || originalData.userId,
          exam_id: originalData.exam_id || originalData.examId,
          settings: originalData.settings || originalData.examSettings,
          examSettings: originalData.examSettings || originalData.settings,
          timestamp: originalData.timestamps || Date.now(),
          buffer: videoBuffer.toString('base64'), // Send raw video data
          isRawVideo: true,
          dataSize: videoBuffer.length
        };
        
        if (examSettings) {
          console.log(`Sending raw video data to AI models: ${videoBuffer.length} bytes`);
          processFrameForAIModels(frameData, examSettings);
        }
        
        // Clean up temp files
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
        if (fs.existsSync(tempJpgPath)) {
          fs.unlinkSync(tempJpgPath);
        }
      });
    
    // Set timeout for raw data processing
    setTimeout(() => {
      try {
        ffmpegCommand.kill('SIGKILL');
        console.log('Raw data JPG extraction killed due to timeout');
      } catch (e) {
        // Process may have already ended
      }
    }, 2000); // 2 second timeout for raw data
    
    ffmpegCommand.save(tempJpgPath);
    
  } catch (error) {
    console.error('Raw video data processing failed:', error);
    
    // Final fallback - send raw data
    const frameData = {
      user_id: originalData.user_id || originalData.userId,
      exam_id: originalData.exam_id || originalData.examId,
      settings: originalData.settings || originalData.examSettings,
      examSettings: originalData.examSettings || originalData.settings,
      timestamp: originalData.timestamps || Date.now(),
      buffer: videoBuffer.toString('base64'),
      isRawVideo: true,
      dataSize: videoBuffer.length
    };
    
    if (examSettings) {
      console.log(`Sending fallback raw video data to AI models: ${videoBuffer.length} bytes`);
      processFrameForAIModels(frameData, examSettings);
    }
  }
}

function processVideoForAI(videoPath: string, originalData: any, examSettings: any, resolve: Function, reject: Function) {
  // Ultra-fast approach: Extract JPG directly to buffer without file I/O
  let frameBufferChunks: Buffer[] = [];
  
  // Extremely fast FFmpeg settings - output directly to stdout as JPG
  const ffmpegCommand = ffmpeg(videoPath)
    .inputOptions([
      '-analyzeduration', '50000',  // 0.05 seconds analysis
      '-probesize', '50000',        // 50KB probe
      '-fflags', '+igndts+discardcorrupt'
    ])
    .outputOptions([
      '-vf', 'scale=160:120',       // Tiny resolution for maximum speed
      '-q:v', '10',                 // Low quality for speed
      '-f', 'image2pipe',           // Output to pipe instead of file
      '-vcodec', 'mjpeg'            // MJPEG codec for JPG output
    ])
    .frames(1)
    .on('start', () => {
      console.log('Direct buffer JPG extraction started');
    })
    .on('end', () => {
      console.log('Direct buffer JPG extraction completed');
      
      // Combine buffer chunks into single JPG buffer
      const jpgBuffer = Buffer.concat(frameBufferChunks);
      
      if (jpgBuffer.length > 0) {
        const frameData = {
          user_id: originalData.user_id || originalData.userId,
          exam_id: originalData.exam_id || originalData.examId,
          settings: originalData.settings || originalData.examSettings,
          examSettings: originalData.examSettings || originalData.settings,
          timestamp: originalData.timestamps || Date.now(),
          buffer: jpgBuffer.toString('base64'),
          isRawVideo: false,
          dataSize: jpgBuffer.length
        };
        
        console.log(`Direct JPG buffer created: ${jpgBuffer.length} bytes`);
        
        if (examSettings) {
          processFrameForAIModels(frameData, examSettings);
        }
      }
      
      // Clean up video file only
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      resolve();
    })
    .on('error', (err) => {
      console.log('Direct buffer extraction failed, using raw data immediately');
      
      // Read the video file and send as raw data
      try {
        const videoBuffer = fs.readFileSync(videoPath);
        const frameData = {
          user_id: originalData.user_id || originalData.userId,
          exam_id: originalData.exam_id || originalData.examId,
          settings: originalData.settings || originalData.examSettings,
          examSettings: originalData.examSettings || originalData.settings,
          timestamp: originalData.timestamps || Date.now(),
          buffer: videoBuffer.toString('base64'),
          isRawVideo: true,
          dataSize: videoBuffer.length
        };
        
        if (examSettings) {
          processFrameForAIModels(frameData, examSettings);
        }
      } catch (readError) {
        console.error('Failed to read video file for raw processing:', readError);
      }
      
      // Clean up video file
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      resolve();
    });
    
  // Capture data directly to buffer from FFmpeg stdout
  const ffmpegStream = ffmpegCommand.pipe();
  ffmpegStream.on('data', (chunk: Buffer) => {
    frameBufferChunks.push(chunk);
  });
    
  // Very aggressive timeout - only 1 second
  setTimeout(() => {
    try {
      ffmpegCommand.kill('SIGKILL');
      console.log('Direct buffer FFmpeg killed due to 1s timeout');
    } catch (e) {
      // Process may have already ended
    }
  }, 1000); // 1 second timeout
  
  // Start the process (no file output)
  ffmpegCommand.run();
}

function tryFallbackFrameExtraction(videoPath: string, originalData: any, examSettings: any, frameOutputPath: string, resolve: Function) {
  // Clean up previous attempt
  if (fs.existsSync(frameOutputPath)) {
    fs.unlinkSync(frameOutputPath);
  }
  
  const userId = originalData.user_id || originalData.userId;
  const fallbackFramePath = path.join('/tmp', `fallback_frame_${userId}_${Date.now()}.jpg`);
  
  ffmpeg(videoPath)
    .inputOptions([
      '-analyzeduration', '1000000',   // Analyze for 1 second max
      '-probesize', '1000000',         // Probe 1MB max
      '-err_detect', 'ignore_err',
      '-fflags', '+igndts+ignidx+genpts',
      '-avoid_negative_ts', 'make_zero',
      '-thread_queue_size', '1'
    ])
    .seekInput(0)
    .duration(0.1)  // Try to process just 0.1 seconds
    .frames(1)
    .format('image2')
    .outputOptions([
      '-q:v', '5',
      '-update', '1'
    ])
    .on('start', (commandLine) => {
      console.log('FFmpeg fallback extraction started:', commandLine);
    })
    .on('end', () => {
      console.log('Fallback frame extraction completed');
      handleSuccessfulFrameExtraction(fallbackFramePath, originalData, examSettings, videoPath, resolve);
    })
    .on('error', (err) => {
      console.log(`Fallback frame extraction also failed: ${err.message}`);
      
      // Final fallback: Try to process raw video data directly
      tryRawDataProcessing(videoPath, originalData, examSettings, resolve);
    })
    .save(fallbackFramePath);
}

function tryRawDataProcessing(videoPath: string, originalData: any, examSettings: any, resolve: Function) {
  console.log('Attempting to create placeholder frame data for AI processing');
  
  try {
    // Read the raw video data
    const videoBuffer = fs.readFileSync(videoPath);
    
    // Create frame data structure preserving all original data
    const frameData = {
      buffer: videoBuffer.toString('base64'), // Send raw video data
      timestamp: Date.now(),
      isRawVideo: true, // Flag to indicate this is raw video data
      dataSize: videoBuffer.length,
      // Ensure we have both userId formats for compatibility
      userId: originalData.user_id || originalData.userId,
      user_id: originalData.user_id || originalData.userId,
      examId: originalData.exam_id || originalData.examId,
      exam_id: originalData.exam_id || originalData.examId
    };
    
    // Send to AI models - they can handle this appropriately
    if (examSettings) {
      console.log(`Sending raw video data to AI models: ${videoBuffer.length} bytes`);
      processFrameForAIModels(frameData, examSettings);
    }
    
    // Clean up video file
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    resolve();
    
  } catch (rawError) {
    console.error('Raw data processing failed:', rawError);
    
    // Clean up and continue without error to avoid blocking the stream
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    resolve(); // Don't reject - continue processing
  }
}

function handleSuccessfulFrameExtraction(frameOutputPath: string, originalData: any, examSettings: any, videoPath: string, resolve: Function) {
  // Ultra-fast frame processing - no file existence checks or validations
  try {
    const frameBuffer = fs.readFileSync(frameOutputPath);
    
    // Create frame data structure immediately
    const frameData = {
      user_id: originalData.user_id || originalData.userId,
      exam_id: originalData.exam_id || originalData.examId,
      settings: originalData.settings || originalData.examSettings,
      examSettings: originalData.examSettings || originalData.settings,
      timestamp: originalData.timestamps || Date.now(),
      buffer: frameBuffer.toString('base64'),
      isRawVideo: false,
      dataSize: frameBuffer.length
    };
    
    // Send to AI models immediately
    if (examSettings) {
      processFrameForAIModels(frameData, examSettings);
    }
    
    console.log(`Ultra-fast frame processing: ${frameBuffer.length} bytes`);
  } catch (frameError) {
    console.log('Frame read failed, continuing...');
  }
  
  // Immediate cleanup without checks
  setImmediate(() => {
    try {
      if (frameOutputPath) fs.unlinkSync(frameOutputPath);
      if (videoPath) fs.unlinkSync(videoPath);
    } catch (e) {
      // Silent cleanup
    }
  });
  
  resolve();
}  async function processFrameForAIModels(data: any, examSettings: any) {
    const uidKey = String(data.userId);
    const verified = authVerified.get(uidKey) === true;
    
    // Always send to web detection
    emitToModel("web_detect", "webDetect", data);
    
    // Send to other models based on settings
    if (examSettings) {
      if (examSettings.eyeball_detection_enabled) {
        emitToModel("eye_position", "eyePosition", data);
      }
      if (examSettings.head_direction_enabled) {
        emitToModel("head_service", "headPosition", data);
      }
    }

    if (!verified) {
      emitToModel("face_service", "faceAuth", data);
      authCounter.set(uidKey, 0);
      return;
    }

    const count = (authCounter.get(uidKey) ?? 0) + 1;
    if (count % 50 === 0) {
      emitToModel("face_service", "faceAuth", data);
      authCounter.set(uidKey, 0);
    } else {
      authCounter.set(uidKey, count);
    }
  }
  function linkSocketToUser(socketId: string, userId?: string | null) {
    if (!userId) return;
    const uid = String(userId);
    const prev = userToSocket.get(uid);
    if (prev && prev !== socketId) socketToUser.delete(prev);
    userToSocket.set(uid, socketId);
    socketToUser.set(socketId, uid);
  }

  function unlinkSocket(socketId: string) {
    const uid = socketToUser.get(socketId);
    if (!uid) return;
    socketToUser.delete(socketId);
    const active = userToSocket.get(uid);
    if (active === socketId) userToSocket.delete(uid);
    isCapture.delete(uid);
    authCounter.delete(uid);
    frameCounter.delete(uid);
    authVerified.delete(uid);
    webDetectFrameCounter.delete(uid);
    
    // Cleanup video processing buffers
    videoBuffers.delete(uid);
    frameCounters.delete(uid);
  }

  function emitToUserById(
    userId: string | undefined,
    event: string,
    payload: any
  ) {
    if (!userId) return;
    const sid = userToSocket.get(String(userId));
    if (!sid) return;
    io.to(sid).emit(event, payload);
  }

  function resolveUserId(socket: Socket): string | null {
    const fromAuth = socket?.handshake?.auth?.userId;
    return fromAuth != null ? String(fromAuth) : null;
  }

  function emitToModel(
    modelId: string | undefined,
    event: string,
    payload: any
  ) {
    if (!modelId) return;
    const sid = modelSocket.get(String(modelId));
    if (!sid) return;
    io.to(sid).emit(event, payload);
  }

  function emitToAllModels(event: string, payload: any) {
    for (const sid of modelSocket.values()) {
      io.to(sid).emit(event, payload);
    }
  }

  let proxy: any = null;
  const storageUrl = storageServerUrl || `https://localhost:3003`;
  console.log("🔗 Attempting to connect to storage server:", storageUrl);

  let storageSocket: any = ioClient(storageUrl, {
    rejectUnauthorized: false, // Accept self-signed certificates
    transports: ["websocket", "polling"],
  });

  // Add connection event handlers for debugging
  storageSocket.on("connect", () => {
    console.log("✅ Connected to storage server");
  });

  storageSocket.on("disconnect", () => {
    console.log("❌ Disconnected from storage server");
  });

  storageSocket.on("connect_error", (error: any) => {
    // console.log("🔥 Storage server connection error:", error.message);
  });

  io.on("connection", (socket: Socket) => {
    const uid = resolveUserId(socket);
    linkSocketToUser(socket.id, uid);

    socket.on("getRtpCapabilities", (cb: Function) => {
      cb({ rtpCapabilities: getRtpCapabilities() });
    });

    socket.on("createWebRtcTransport", async ({ direction }: { direction: string }, cb: Function) => {
      const transportOptions = await createTransport();
      cb(transportOptions);
    });

    socket.on(
      "connectTransport",
      async ({ transportId, dtlsParameters }: { transportId: string; dtlsParameters: any }, cb: Function) => {
        await connectTransport(transportId, dtlsParameters);
        cb();
      }
    );

    socket.on("produce", async ({ transportId, kind, rtpParameters }: { transportId: string; kind: 'audio' | 'video'; rtpParameters: any }, cb: Function) => {
      const id = await produce(transportId, kind, rtpParameters);
      cb({ id });
    });

    socket.on("test", () => {
      console.log("test is connected");
    });
    socket.on("register-python", (payload: any) => {
      const modelId = String(payload?.service ?? "");
      if (!modelId) return;

      modelSocket.set(modelId, socket.id);
      socketToModel.set(socket.id, modelId);
      console.log(modelId, socket.id);

      socket.removeAllListeners("thirdeye_cam_result");
      socket.removeAllListeners("face_data_saved");
      socket.removeAllListeners("drag_camera_result");
      socket.removeAllListeners("result");

      socket.on("thirdeye_cam_result", (data: any) => {
        addScore(data);
        if (proxy) {
          proxy.emit("thirdeye_alert", data);
        }
      });

      socket.on("face_data_saved", (data: any) => {
        const uid = String(data?.userId ?? data?.user_id ?? "");
        if (uid) isCapture.delete(uid);
        console.log("face_data_saved");
        emitToUserById(uid || data?.userId, "face_save_status", data);
      });

      socket.on("mobileDetectRes", (data: any) => {
        addScore(data);
        emitToUserById(data?.userId, "mobileDetectRes-client", data);
      });

      socket.on("result", (data: any) => {
        emitToUserById(data?.userId, "fres", data);
      });
    });

    socket.on("faceAuthRes", (data: any) => {
      const uid = String(data?.userId);
      if (data?.auth === true) {
        authVerified.set(uid, true);
      } else {
        authVerified.set(uid, false);
      }
      addScore({
        userId: data?.userId,
        examId: data?.examId,
        auth_face: data?.auth,
        timestamp: data.timestamp
      });
      console.log("auth");

      emitToUserById(data?.userId, "faceAuthRes-client", data);
    });

    socket.on("headPositionRes", (data: any) => {
      const uid = String(data?.userId);
      console.log(data);
      addScore({
        userId: data?.userId,
        examId: data?.examId,
        head_position: data?.data?.headPos,
        timestamp: data.timestamp
      });
      emitToUserById(data?.userId, "headPositionRes-client", data);
    });

    socket.on("eyePositionRes", (data: any) => {
      const left = data?.data?.leftEye;
      const right = data?.data?.rightEye;
      
      console.log(left, right, "hi");
      console.log(data);
      addScore({
        userId: data?.userId,
        examId: data?.examId,
        eyes: [left, right].filter(Boolean),
        timestamp:data.timestamp
      });
      emitToUserById(data?.userId, "eyePositionRes-client", data);
    });

    socket.on("webDetectRes", (data: any) => {
      const uid = String(data?.userId);
      console.log(data);
      

        addScore({
          userId: data?.userId,
          examId: data?.examId,
          object_detected: {
            "cell phone": Number(data?.data?.Mobile || 0) > 0,
          },
          no_of_person: data?.data?.Person,
          timestamp:data.timestamp
        });
        emitToUserById(data?.userId, "webDetectRes-client", data);
    });
    socket.on("videos", (data: any) => {
      emitToModel("thirdeye_detect", "mobileDetect", data);
    });
    socket.on("recorder-add-video-stream-chunk", (data: any) => {
      const userId = data?.user_id;
      const examSettings = data?.examSettings ?? data?.settings;
      console.log("Received video chunk from user: .... ", userId);
      if (userId && examSettings) {
        processVideoChunk(data, userId, examSettings).catch(error => {
          console.error('Error processing video chunk for AI analysis:', error);
        });
      }

      if (storageSocket && storageSocket.connected) {
        storageSocket.emit("add-video-stream-chunk", data);
      } else {
        console.warn("⚠️ Storage socket not connected - dropping video chunk");
      }
    });
    socket.on("start-exam", (data: any) => {
      if (storageSocket && storageSocket.connected) {
        console.log("📹 Starting video recording for exam:", data.exam_id);
        storageSocket.emit("start-stream-recording", data);
      } else {
        console.error(
          "❌ Cannot start recording - storage socket not connected"
        );
      }
    });
    socket.on("end-exam", (data: any) => {
      if (storageSocket && storageSocket.connected) {
        console.log("⏹️ Stopping video recording for exam:", data.exam_id);
        storageSocket.emit("stop-stream-recording", data);
      } else {
        console.error(
          "❌ Cannot stop recording - storage socket not connected"
        );
      }
    });

    socket.on("photo-save", (data: any) => {
      console.log("sending data", data);
      emitToModel("face_service", "faceStore", data);
    });

    // socket.on("authenticate", (data: any) => {
    //   const uidKey = String((data as any)?.userId);
    //   const verified = authVerified.get(uidKey) === true;
    //   const { userId }: any = String(data?.userId);
    //   emitToModel("web_detect", "webDetect", data);
    //   const settings = (data as any)?.examSettings ?? (data as any)?.settings;
    //   if (settings) {
    //     if (settings.eyeball_detection_enabled) {
    //       emitToModel("eye_position", "eyePosition", data);
    //     }
    //     if (settings.head_direction_enabled)
    //       emitToModel("head_service", "headPosition", data);
    //   }

    //   if (!verified) {
    //     emitToModel("face_service", "faceAuth", data);
    //     authCounter.set(uidKey, 0);
    //     return;
    //   }

    //   const count = (authCounter.get(uidKey) ?? 0) + 1;
    //   if (count % 50 === 0) {
    //     emitToModel("face_service", "faceAuth", data);
    //     authCounter.set(uidKey, 0);
    //   } else {
    //     authCounter.set(uidKey, count);
    //   }
    // });

    socket.on("submit", async (data: any, cb: Function) => {
      try {
        const { userId, examId } = data || {};
        const raw = getExamScore(userId, examId);
        if (!raw) {
          const failPayload = {
            success: false,
            message: "No score data found",
          };
          emitToUserById(userId, "exam_score", failPayload);
          if (typeof cb === "function") cb(failPayload);
          return;
        }
        const computed = await calculateExamScore(raw);
        
        const payload = { success: true, score: computed };
        emitToUserById(userId, "exam_score", payload);
        if (typeof cb === "function") cb(payload);
        
      } catch (err: any) {
        const errorPayload = {
          success: false,
          message: err?.message || "Score calculation failed",
        };
        if (data?.userId)
          emitToUserById(data.userId, "exam_score", errorPayload);
        if (typeof cb === "function") cb(errorPayload);
      }
    });

    socket.on("frame", (data: any) => {
      // console.log("framing");
      emitToModel("face_service", "process-frame", data);
    });

    socket.on("register-third-eye-setup", (data: any) => {
      const { userId } = data;
      console.log(`Third eye setup registered for user: ${userId}`);
    });
  socket.on("mobile-acknowledgment", (data) => {
      const { userId } = data;
      console.log("Mobile device connected - sending acknowledgment");
      emitToUserById(userId, "mobile-connected", {
        status: true,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      unlinkSocket(socket.id);
      const modelId = socketToModel.get(socket.id);
      if (modelId) modelSocket.delete(modelId);
      socketToModel.delete(socket.id);
    });
  });

  return io;
}
