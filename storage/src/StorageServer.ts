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
        chunkNumber?: number;
        isFinal?: boolean;
        totalChunks?: number;
      }) => {
        const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

        if (!recorder[fileName]) {
          console.log("Recorder not found for", fileName, "- chunk will be dropped");
          return;
        }

        if (!data.chunk) {
          console.log("⚠️ Empty chunk received for", fileName);
          return;
        }

        const buf = Buffer.isBuffer(data.chunk)
          ? data.chunk
          : Buffer.from(new Uint8Array(data.chunk));

        const writeSuccess = recorder[fileName].write(buf);
        
        if (recordingActive[fileName]) {
          console.log(`✅ Written chunk #${data.chunkNumber || '?'} for ${fileName}: ${buf.length} bytes`);
        } else {
          console.log(`📹 Written chunk #${data.chunkNumber || '?'} for ${fileName}: ${buf.length} bytes (after stop signal)`);
        }

        // ✅ Check for backpressure
        if (!writeSuccess) {
          console.warn(`⚠️ WriteStream buffer full for ${fileName} - backpressure detected`);
          recorder[fileName].once('drain', () => {
            console.log(`✅ ${fileName} buffer drained`);
          });
        }

        // ✅ If this is marked as the final chunk, close the stream
        if (data.isFinal) {
          console.log(`🏁 Final chunk received for ${fileName} (chunk #${data.chunkNumber}/${data.totalChunks})`);
          
          // Small delay to ensure write completes
          setTimeout(() => {
            if (recorder[fileName]) {
              // Check if buffer needs draining before closing
              if (recorder[fileName].writableNeedDrain) {
                console.log(`⏳ ${fileName} waiting for buffer to drain before closing...`);
                recorder[fileName].once('drain', () => {
                  console.log(`✅ ${fileName} drained, now closing...`);
                  closeRecorder(fileName);
                });
              } else {
                console.log(`✅ ${fileName} buffer empty, closing immediately...`);
                closeRecorder(fileName);
              }
            }
          }, 500); // 500ms to ensure write completes
        }
      }
    );

    // Helper function to close recorder
    const closeRecorder = (fileName: string) => {
      if (recorder[fileName]) {
        recorder[fileName].end((error: Error | null | undefined) => {
          if (error) {
            console.error(`❌ Error closing ${fileName}:`, error);
          } else {
            console.log(`✅ Recording successfully ended: ${fileName}`);
          }
          delete recorder[fileName];
          delete recordingActive[fileName];
        });
        
        recorder[fileName].on('finish', () => {
          console.log(`✅ WriteStream finished for: ${fileName}`);
        });
      }
    };

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category:string; isFinal?: boolean; totalChunks?: number }) => {
        const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

        if (recorder[fileName]) {
          // Mark as inactive to signal we're in closing phase
          recordingActive[fileName] = false;
          
          console.log(`🛑 Stop signal received for: ${fileName} (total chunks: ${data.totalChunks || 'unknown'})`);
          console.log(`⏳ Waiting for final chunk with isFinal flag...`);
          
          // ✅ Set a safety timeout in case final chunk never arrives (10 seconds)
          setTimeout(() => {
            if (recorder[fileName]) {
              console.warn(`⚠️ Timeout waiting for final chunk for ${fileName} - force closing`);
              closeRecorder(fileName);
            }
          }, 10000);
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
