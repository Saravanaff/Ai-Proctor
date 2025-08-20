import { Readable, Writable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { generateFileName } from './utils/utils';

dotenv.config();

const storageServerPort = process.env.STORAGE_SERVER_PORT;



class VideoStreamRecorder {
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
        '-c:v libvpx', // VP8 decoder for input
        '-avoid_negative_ts make_zero'
      ])
      .videoCodec('libx264')
      .outputOptions([
        '-preset ultrafast',
        '-crf 23', // quality setting
        '-pix_fmt yuv420p', // ensures compatibility
        '-movflags +faststart', // enables streaming
        '-avoid_negative_ts make_zero', // handle timestamp issues
        '-fflags +genpts', // generate presentation timestamps
        '-f mp4' // explicit format
      ])
      .noAudio() // remove audio codec since WebM might not have audio
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


interface RecorderType {
  [key : string] : VideoStreamRecorder;
}


const startStorageServer = async () => {
    const app = express();

    app.get('/',(req : Request,res : Response) => {
        res.send("DVD Storage");
    })

    const httpServer = createServer(app);

    const io = new Server(httpServer,{
        transports:['websocket','polling'],
        cors:{
            origin:"*",
            methods:["GET","POST"],
        }
    })

    io.on('connection', (socket : Socket) => {
      console.log("Connected")
      let recorder: RecorderType = {};

      socket.on('start-stream-recording', (data: { user_id: string, category: string }) => {
        console.log("Starting the Stream ",data);
        const fileName = generateFileName(data.user_id,data.category);
        const outputPath = path.join(__dirname, 'recordings', `${fileName}.mp4`);
        recorder[fileName] = new VideoStreamRecorder(outputPath);
        if (fileName && recorder[fileName]) {
          console.log("Video Recording Started...");
          recorder[fileName]?.startRecording();
        }
      });

      socket.on('add-video-stream-chunk', (data: { user_id: string, category: string, chunk: ArrayBuffer }) => {
        const fileName = generateFileName(data.user_id,data.category);
        console.log("Adding chunk to ",data);
        if (recorder[fileName]) {
          const buf = Buffer.isBuffer(data.chunk)
            ? data.chunk
            : Buffer.from(new Uint8Array(data.chunk)); // convert properly
          recorder[fileName].addVideoChunk(buf);
        }
      });


      socket.on('stop-stream-recording', (data : { user_id : string, category: string }) => {
        const fileName = generateFileName(data.user_id,data.category);
        if (recorder && recorder[fileName]) {
          console.log("Video Recording Ended...",data);
          recorder[fileName]?.stopRecording();
          delete recorder[fileName];
        }
      });
    });

    try {
      httpServer.listen(storageServerPort,() =>{
          console.log(`Storage Server Started in Port ${storageServerPort}`);
      })
    }catch(err){
      console.log("(: Error Listening Port :) \n",err);
    }
}

startStorageServer();


