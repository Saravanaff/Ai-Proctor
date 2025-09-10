import { Readable, Writable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

import path from 'path';
import fs from 'fs';


interface VideoQualitySettings {
  crf?: number; // 18 = high quality, 23 = default, 28 = lower quality
  preset?: string; // ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
  resolution?: string; // e.g., '1280x720', '1920x1080'
}

export class VideoStreamRecorder {
  private inputStream: Readable;
  private outputPath: string;
  private ffmpegProcess: any;
  private qualitySettings: VideoQualitySettings;
  
  constructor(outputPath: string, qualitySettings: VideoQualitySettings = {}) {
    console.log(`📁 Video will be saved to: ${outputPath}`);
    this.outputPath = outputPath;
    this.qualitySettings = {};
    this.qualitySettings.crf = qualitySettings.crf ?? 18; // High quality by default
    this.qualitySettings.preset = qualitySettings.preset ?? 'medium';
    if (qualitySettings.resolution) {
      this.qualitySettings.resolution = qualitySettings.resolution;
    }
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    this.inputStream = new Readable({
      read() {} 
    });
  }
  
  startRecording() {
    const outputOptions = [
      `-preset ${this.qualitySettings.preset}`, // configurable preset
      `-crf ${this.qualitySettings.crf}`, // configurable quality
      '-pix_fmt yuv420p', // Safari/iOS compatibility
      '-movflags +faststart', // progressive playbook
      '-fflags +genpts', // regenerate timestamps
      '-profile:v high', // H.264 high profile for better compression
      '-level 4.0', // H.264 level
      '-tune film', // optimize for film content
      '-x264opts keyint=30:min-keyint=30', // keyframe every 1 second at 30fps
      '-f mp4'
    ];

    // Add resolution scaling if specified
    if (this.qualitySettings.resolution) {
      outputOptions.push(`-s ${this.qualitySettings.resolution}`);
    }

    this.ffmpegProcess = ffmpeg()
    .input(this.inputStream)
    .inputFormat('webm')
    .inputOptions([
      '-avoid_negative_ts make_zero', // handle bad timestamps
      '-analyzeduration 0', // don't spend time analyzing
      '-probesize 32' // reduce probe size for faster processing
    ])
    .videoCodec('libx264') // transcode VP8/VP9 -> H.264
    .outputOptions(outputOptions)
    // .noAudio()  <-- only keep this if you *never* want audio
    .format('mp4')
    .save(this.outputPath)
    .on('start', cmd => console.log('📹 Recording started with quality settings:', this.qualitySettings, '\nCommand:', cmd))
    .on('end', () => console.log('✅ Recording finished'))
    .on('error', err => console.error('❌ Recording error:', err));

  }

  addVideoChunk(chunk: Buffer) {
    if (chunk && chunk.length > 0) {
      console.log(`📦 Adding video chunk: ${chunk.length} bytes`);
      this.inputStream.push(chunk);
    } else {
      console.warn("⚠️ Received empty or invalid video chunk");
    }
  }
  
  stopRecording() {
    this.inputStream.push(null); // End the stream
    // if (this.ffmpegProcess) {
    //   this.ffmpegProcess.kill('SIGTERM');
    // }
  }
}
