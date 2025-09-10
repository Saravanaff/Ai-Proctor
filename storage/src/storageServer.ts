import { Server, Socket } from "socket.io";
import { createServer } from "https";
import express, { Request, Response } from "express";
import path from "path";
import { generateFileName } from "./utils/utils";
import cors from "cors";
import fs from "fs";
import { getVideoQualityPreset } from "./config/videoQuality";

import { VideoStreamRecorder } from "./services/VideoStreamRecorder";
import downloadableRoutes from "./routes/downloadableRoutes";

import dotenv from "dotenv";

dotenv.config();

const storageServerPort = process.env.STORAGE_SERVER_PORT;
const videoQuality = (process.env.VIDEO_QUALITY_PRESET || 'high') as keyof typeof import('./config/videoQuality').VIDEO_QUALITY_PRESETS;

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

  // Read SSL certificate files
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, "..", "localhost-key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "..", "localhost-cert.pem")),
    ca: fs.readFileSync(path.join(__dirname, "..", "rootCA.pem"))
  };

  const httpsServer = createServer(httpsOptions, app);

  const io = new Server(httpsServer, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("✅ Storage server: Client connected", socket.id);
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
        // Configure video quality from environment variable (default: high)
        const qualityPreset = getVideoQualityPreset(videoQuality);
        const qualitySettings: any = {
          crf: qualityPreset.crf,
          preset: qualityPreset.preset
        };
        if (qualityPreset.resolution) {
          qualitySettings.resolution = qualityPreset.resolution;
        }
        console.log(`🎥 Using video quality preset: ${qualityPreset.name} - ${qualityPreset.description}`);
        recorder[fileName] = new VideoStreamRecorder(outputPath, qualitySettings);
        if (fileName && recorder[fileName]) {
          console.log("🎬 Video Recording Started with high quality settings...");
          recorder[fileName]?.startRecording();
        }
      }
    );

    socket.on(
      "add-video-stream-chunk",
      (data: { user_id: string; exam_id: string; category: string; chunk: ArrayBuffer }) => {
        const fileName = generateFileName(data.user_id, data.exam_id, data.category);
        if (recorder[fileName]) {
          // Validate chunk data
          if (!data.chunk) {
            console.warn("⚠️ Received empty chunk data");
            return;
          }
          
          const buf = Buffer.isBuffer(data.chunk)
            ? data.chunk
            : Buffer.from(new Uint8Array(data.chunk)); // convert properly
          
          if (buf.length === 0) {
            console.warn("⚠️ Received empty buffer");
            return;
          }
          
          console.log(`📦 Adding chunk: ${buf.length} bytes for ${fileName}`);
          recorder[fileName].addVideoChunk(buf);
        } else {
          console.warn(`⚠️ No recorder found for ${fileName}`);
        }
      }
    );

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category: string }) => {
        const fileName = generateFileName(data.user_id, data.exam_id, data.category);
        if (recorder && recorder[fileName]) {
          console.log("⏹️ Video Recording Ended for:", fileName);
          recorder[fileName]?.stopRecording();
          delete recorder[fileName];
        } else {
          console.warn(`⚠️ No active recorder found for ${fileName}`);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("❌ Storage server: Client disconnected", socket.id);
    });
  });

  try {
    httpsServer.listen(storageServerPort, () => {
      console.log(`Storage Server Started in Port ${storageServerPort} (HTTPS)`);
    });
  } catch (err) {
    console.log("(: Error Listening Port :) \n", err);
  }
};

startStorageSocketServer();
