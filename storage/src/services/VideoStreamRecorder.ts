import { Readable, Writable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

import path from 'path';
import fs from 'fs';


export class VideoStreamRecorder {
  private inputStream: Readable;
  private outputPath: string;
  private ffmpegProcess: any;
  
  constructor(outputPath: string) {
    console.log(`the file might be ${outputPath}`)
    this.outputPath = outputPath;
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    this.inputStream = new Readable({
      read() {} 
    });
  }
  
  startRecording() {
    this.ffmpegProcess = ffmpeg()
    .input(this.inputStream)
    .inputFormat('webm')
    .inputOptions([
      '-avoid_negative_ts make_zero' // handle bad timestamps
    ])
    .videoCodec('libx264') // transcode VP8 -> H.264
    .outputOptions([
      '-preset ultrafast',
      '-crf 23', // quality control
      '-pix_fmt yuv420p', // Safari/iOS compatibility
      '-movflags +faststart', // progressive playback
      '-fflags +genpts', // regenerate timestamps
      '-f mp4'
    ])
    // .noAudio()  <-- only keep this if you *never* want audio
    .format('mp4')
    .save(this.outputPath)
    .on('start', cmd => console.log('Recording started:', cmd))
    .on('end', () => console.log('Recording finished'))
    .on('error', err => console.error('Recording error:', err));

  }

  addVideoChunk(chunk: Buffer) {
    console.log("Adding Data...");
    this.inputStream.push(chunk);
  }
  
  stopRecording() {
    this.inputStream.push(null); // End the stream
    // if (this.ffmpegProcess) {
    //   this.ffmpegProcess.kill('SIGTERM');
    // }
  }
}
