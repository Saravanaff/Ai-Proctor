import { Server, Socket } from "socket.io";
import { createServer } from "https";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const storageServerPort = 3003;

interface RecorderMap {
  [fileName: string]: fs.WriteStream;
}

const startStorageSocketServer = async () => {
  const app = express();

  app.use(
    cors({
      origin: "*",
    })
  );

  app.get("/", (req, res) => {
    res.send("✅ Storage Server Running");
  });

  // SSL
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, "..", "localhost-key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "..", "localhost-cert.pem")),
  };

  const httpsServer = createServer(httpsOptions, app);

  const io = new Server(httpsServer, {
    transports: ["websocket", "polling"],
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log("✅ Client connected:", socket.id);

    let recorder: RecorderMap = {};
    let recordingActive: { [fileName: string]: boolean } = {};

    socket.on(
      "start-stream-recording",
      (data: { user_id: string; exam_id: string; category: string }) => {
        console.log(data);
        const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;
        const outputPath = path.join(
          __dirname,
          "recordings",
          `${fileName}.webm`
        );

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        recorder[fileName] = fs.createWriteStream(outputPath);
        recordingActive[fileName] = true;
        console.log("🎬 Recording started:", outputPath);
      }
    );

    socket.on(
      "add-video-stream-chunk",
      (data: {
        user_id: string;
        exam_id: string;
        category: string;
        chunk: ArrayBuffer;
      }) => {
        const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

        if (!recorder[fileName]) {
          console.log("⚠️ Recorder not found for", fileName, "- chunk will be dropped");
          return;
        }

        if (!data.chunk) {
          console.log("⚠️ Empty chunk received for", fileName);
          return;
        }

        const buf = Buffer.isBuffer(data.chunk)
          ? data.chunk
          : Buffer.from(new Uint8Array(data.chunk));

        // Always write chunks while recorder exists, even if marked inactive
        // This ensures the final chunk with WebM footer gets written
        recorder[fileName].write(buf);
        
        if (recordingActive[fileName]) {
          console.log("📹 Written chunk for", fileName, ":", buf.length, "bytes");
        } else {
          console.log("📹 Written FINAL chunk for", fileName, ":", buf.length, "bytes (after stop signal)");
        }
      }
    );

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category:string}) => {
        const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

        if (recorder[fileName]) {
          // Mark as inactive to signal we're in closing phase
          recordingActive[fileName] = false;
          
          console.log("⏹️ Stop signal received for:", fileName, "- waiting for final chunk");
          
          // Wait 2 seconds for final chunk to arrive (accounts for async buffer conversion + network)
          setTimeout(() => {
            if (recorder[fileName]) {
              recorder[fileName].end();
              console.log("✅ Recording finalized and closed:", fileName);
              delete recorder[fileName];
              delete recordingActive[fileName];
            }
          }, 2000);
        } else {
          console.log("⚠️ No recorder found to stop for", fileName);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  httpsServer.listen(storageServerPort, () =>
    console.log(`✅ Storage Server Running on : ${storageServerPort}`)
  );
};

startStorageSocketServer();
