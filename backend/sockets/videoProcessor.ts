import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
const ffmpegStatic = require("ffmpeg-static");

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const videoBuffers = new Map<string, Buffer[]>();
const frameCounters = new Map<string, number>();

export async function validateVideoFile(filePath: string): Promise<boolean> {
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

export async function processVideoChunk(data: any, userId: string, examSettings: any, processFrameCallback: Function) {
  return new Promise<void>((resolve, reject) => {
    if (!data.chunk || data.chunk.length === 0) {
      console.error('Invalid video chunk: empty or null data');
      reject(new Error('Invalid video chunk data'));
      return;
    }
    
    if (!Buffer.isBuffer(data.chunk)) {
      console.error('Video chunk is not a Buffer');
      reject(new Error('Invalid video chunk format'));
      return;
    }
    
    console.log(`Processing video chunk: ${data.chunk.length} bytes from user ${userId}`);
    
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
    const shouldProcess = frameCount % 5 === 0 || totalBufferSize > 512 * 1024;
    
    if (shouldProcess && userBuffers.length > 0) {
      try {
        // Combine all buffered chunks
        const combinedBuffer = Buffer.concat(userBuffers);
        console.log(`Fast processing video buffer: ${combinedBuffer.length} bytes for user ${userId}`);
        
        // Process video data
        processVideoDataUltraFast(combinedBuffer, data, examSettings, processFrameCallback);
        
        // Clear the buffer immediately
        videoBuffers.set(userId, []);
        resolve();
        
      } catch (error) {
        console.error('Error processing video buffer:', error);
        reject(error);
      }
    } else {
      console.log(`Accumulated chunk ${frameCount} for user ${userId}, buffer size: ${totalBufferSize} bytes`);
      resolve();
    }
  });
}

function processVideoDataUltraFast(videoBuffer: Buffer, originalData: any, examSettings: any, processFrameCallback: Function) {
  console.log('Ultra-fast video processing - skipping FFmpeg entirely');
  
  try {
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
      console.log(`Ultra-fast: Sending raw data to AI models: ${videoBuffer.length} bytes`);
      processFrameCallback(frameData, examSettings);
    }
    
  } catch (error) {
    console.error('Ultra-fast processing failed:', error);
  }
}

export function checkForWebMSignature(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  
  for (let i = 0; i < Math.min(buffer.length - 4, 100); i++) {
    if (buffer[i] === 0x1A && buffer[i + 1] === 0x45 && 
        buffer[i + 2] === 0xDF && buffer[i + 3] === 0xA3) {
      return true;
    }
  }
  
  return false;
}

export function processRawVideoData(videoBuffer: Buffer, originalData: any, examSettings: any, processFrameCallback: Function) {
  console.log('Processing raw video data directly for AI analysis');
  
  try {
    const userId = originalData.user_id || originalData.userId;
    const tempVideoPath = path.join('/tmp', `raw_video_${userId}_${Date.now()}.webm`);
    const tempJpgPath = path.join('/tmp', `raw_frame_${userId}_${Date.now()}.jpg`);
    
    fs.writeFileSync(tempVideoPath, videoBuffer);
    
    const ffmpegCommand = ffmpeg(tempVideoPath)
      .inputOptions([
        '-f', 'webm',
        '-err_detect', 'ignore_err',
        '-fflags', '+igndts+ignidx',
        '-analyzeduration', '100000',
        '-probesize', '100000'
      ])
      .outputOptions([
        '-vf', 'scale=320:240',
        '-q:v', '8',
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
              buffer: jpgBuffer.toString('base64'),
              isRawVideo: false,
              dataSize: jpgBuffer.length
            };
            
            if (examSettings) {
              console.log(`Sending optimized JPG to AI models: ${jpgBuffer.length} bytes`);
              processFrameCallback(frameData, examSettings);
            }
            
            fs.unlinkSync(tempJpgPath);
          }
        } catch (error) {
          console.error('Error processing extracted JPG:', error);
        }
        
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
      })
      .on('error', (err) => {
        console.log('Failed to extract JPG from raw data, sending raw data');
        
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
          console.log(`Sending raw video data to AI models: ${videoBuffer.length} bytes`);
          processFrameCallback(frameData, examSettings);
        }
        
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
        if (fs.existsSync(tempJpgPath)) {
          fs.unlinkSync(tempJpgPath);
        }
      });
    
    setTimeout(() => {
      try {
        ffmpegCommand.kill('SIGKILL');
        console.log('Raw data JPG extraction killed due to timeout');
      } catch (e) {
        // Process may have already ended
      }
    }, 2000);
    
    ffmpegCommand.save(tempJpgPath);
    
  } catch (error) {
    console.error('Raw video data processing failed:', error);
    
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
      processFrameCallback(frameData, examSettings);
    }
  }
}

export function processVideoForAI(videoPath: string, originalData: any, examSettings: any, processFrameCallback: Function, resolve: Function, reject: Function) {
  let frameBufferChunks: Buffer[] = [];
  
  const ffmpegCommand = ffmpeg(videoPath)
    .inputOptions([
      '-analyzeduration', '50000',
      '-probesize', '50000',
      '-fflags', '+igndts+discardcorrupt'
    ])
    .outputOptions([
      '-vf', 'scale=160:120',
      '-q:v', '10',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg'
    ])
    .frames(1)
    .on('start', () => {
      console.log('Direct buffer JPG extraction started');
    })
    .on('end', () => {
      console.log('Direct buffer JPG extraction completed');
      
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
          processFrameCallback(frameData, examSettings);
        }
      }
      
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      resolve();
    })
    .on('error', (err) => {
      console.log('Direct buffer extraction failed, using raw data immediately');
      
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
          processFrameCallback(frameData, examSettings);
        }
      } catch (readError) {
        console.error('Failed to read video file for raw processing:', readError);
      }
      
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      resolve();
    });
    
  const ffmpegStream = ffmpegCommand.pipe();
  ffmpegStream.on('data', (chunk: Buffer) => {
    frameBufferChunks.push(chunk);
  });
    
  setTimeout(() => {
    try {
      ffmpegCommand.kill('SIGKILL');
      console.log('Direct buffer FFmpeg killed due to 1s timeout');
    } catch (e) {
      // Process may have already ended
    }
  }, 1000);
  
  ffmpegCommand.run();
}

export function cleanupVideoBuffers(userId: string) {
  videoBuffers.delete(userId);
  frameCounters.delete(userId);
}
