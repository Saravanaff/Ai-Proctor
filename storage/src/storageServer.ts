import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express, { Request, Response } from "express";
import path from "path";
import { generateFileName } from "./utils/utils";
import cors from "cors";

import { VideoStreamRecorder } from "./services/VideoStreamRecorder";
import downloadableRoutes from "./routes/downloadableRoutes";

import dotenv from "dotenv";

dotenv.config();

const storageServerPort = process.env.STORAGE_SERVER_PORT;

interface RecorderType {
  [key: string]: VideoStreamRecorder;
}

const startStorageSocketServer = async () => {
  const app = express();

  // Enable CORS for all routes
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.get("/", (req: Request, res: Response) => {
    res.send("DVD Storage");
  });

  app.use("/", downloadableRoutes);

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("Connected");
    let recorder: RecorderType = {};

    socket.on(
      "start-stream-recording",
      (data: { user_id: string; category: string, exam_id: string }) => {
        console.log("Starting the Stream ", data);
        const fileName = generateFileName(data.user_id, data.exam_id, data.category);
        const outputPath = path.join(
          __dirname,
          "recordings",
          `${fileName}.mp4`
        );
        recorder[fileName] = new VideoStreamRecorder(outputPath);
        if (fileName && recorder[fileName]) {
          console.log("Video Recording Started...");
          recorder[fileName]?.startRecording();
        }
      }
    );

    socket.on(
      "add-video-stream-chunk",
      (data: { user_id: string; exam_id: string; category: string; chunk: ArrayBuffer }) => {
        const fileName = generateFileName(data.user_id, data.exam_id, data.category);
        console.log("Adding chunk to ", data);
        if (recorder[fileName]) {
          const buf = Buffer.isBuffer(data.chunk)
            ? data.chunk
            : Buffer.from(new Uint8Array(data.chunk)); // convert properly
          recorder[fileName].addVideoChunk(buf);
        }
      }
    );

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category: string }) => {
        const fileName = generateFileName(data.user_id, data.exam_id, data.category);
        if (recorder && recorder[fileName]) {
          console.log("Video Recording Ended...", data);
          recorder[fileName]?.stopRecording();
          delete recorder[fileName];
        }
      }
    );
  });

  try {
    httpServer.listen(storageServerPort, () => {
      console.log(`Storage Server Started in Port ${storageServerPort}`);
    });
  } catch (err) {
    console.log("(: Error Listening Port :) \n", err);
  }
};

startStorageSocketServer();
