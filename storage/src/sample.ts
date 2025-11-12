import { Server, Socket } from "socket.io";
import { createServer } from "https";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const storageServerPort = process.env.STORAGE_SERVER_PORT 
  ? parseInt(process.env.STORAGE_SERVER_PORT) 
  : 3003;

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
    res.send("Storage Server Running");
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  let httpsOptions;
  try {
    const keyPath = path.join(__dirname, "..", "localhost-key.pem");
    const certPath = path.join(__dirname, "..", "localhost-cert.pem");

    if (!fs.existsSync(keyPath)) {
      throw new Error(`SSL key file not found: ${keyPath}`);
    }
    if (!fs.existsSync(certPath)) {
      throw new Error(`SSL certificate file not found: ${certPath}`);
    }

    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (error) {
    console.error("Failed to load SSL certificates:", error);
    process.exit(1);
  }

  const httpsServer = createServer(httpsOptions, app);

  const io = new Server(httpsServer, {
    transports: ["websocket", "polling"],
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log(" Client connected:", socket.id);

    let recorder: RecorderMap = {};
    let recordingActive: { [fileName: string]: boolean } = {};

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on(
      "start-stream-recording",
      (data: { user_id: string; exam_id: string; category: string }) => {
        try {
          if (!data || !data.user_id || !data.exam_id || !data.category) {
            console.error(" Invalid start-stream-recording data:", data);
            socket.emit("recording-error", { 
              error: "Missing required fields: user_id, exam_id, or category" 
            });
            return;
          }

          const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;
          
          if (recorder[fileName]) {
            console.warn(" Recording already exists for:", fileName);
            return;
          }

          const outputPath = path.join(
            __dirname,
            "recordings",
            `${fileName}.webm`
          );

          try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          } catch (dirError) {
            console.error(" Failed to create recordings directory:", dirError);
            socket.emit("recording-error", { 
              error: "Failed to create recordings directory" 
            });
            return;
          }

          const writeStream = fs.createWriteStream(outputPath);
          
          writeStream.on("error", (error) => {
            console.error(" WriteStream error for", fileName, ":", error);
            delete recorder[fileName];
            delete recordingActive[fileName];
            socket.emit("recording-error", { 
              fileName, 
              error: error.message 
            });
          });

          writeStream.on("finish", () => {
            console.log(" WriteStream finished for:", fileName);
          });

          recorder[fileName] = writeStream;
          recordingActive[fileName] = true;
          
          console.log(" Recording started:", outputPath);
          socket.emit("recording-started", { fileName, outputPath });
        } catch (error: any) {
          console.error(" Error in start-stream-recording:", error);
          socket.emit("recording-error", { 
            error: error.message || "Unknown error" 
          });
        }
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
        try {
          if (!data || !data.user_id || !data.exam_id || !data.category) {
            console.error("Invalid chunk data received");
            return;
          }

          const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

          if (!recorder[fileName]) {
            console.log("Recorder not found for", fileName, "- chunk will be dropped");
            return;
          }

          if (!recordingActive[fileName]) {
            console.log("Recording not active for", fileName, "- ignoring chunk");
            return;
          }

          if (!data.chunk || data.chunk.byteLength === 0) {
            console.log("Empty chunk received for", fileName);
            return;
          }

          let buf: Buffer;
          try {
            buf = Buffer.isBuffer(data.chunk)
              ? data.chunk
              : Buffer.from(new Uint8Array(data.chunk));
          } catch (bufferError) {
            console.error(" Failed to convert chunk to buffer:", bufferError);
            return;
          }

          const writeSuccess = recorder[fileName].write(buf);
          
          if (!writeSuccess) {
            console.warn("WriteStream buffer is full for", fileName);
          }

          console.log(" Written chunk for", fileName, ":", buf.length, "bytes");
        } catch (error: any) {
          console.error("Error in add-video-stream-chunk:", error);
        }
      }
    );

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category: string }) => {
        try {
          if (!data || !data.user_id || !data.exam_id || !data.category) {
            console.error("Invalid stop-stream-recording data:", data);
            return;
          }

          const fileName = `${data.user_id}_${data.exam_id}_${data.category}`;

          if (!recorder[fileName]) {
            console.log("No recorder found to stop for", fileName);
            socket.emit("recording-already-stopped", { fileName });
            return;
          }

          recordingActive[fileName] = false;
          console.log("Stop signal received for:", fileName);

          setTimeout(() => {
            if (recorder[fileName]) {
              recorder[fileName].end((error?: Error) => {
                if (error) {
                  console.error("Error closing WriteStream for", fileName, ":", error);
                } else {
                  console.log("Recording successfully ended:", fileName);
                  socket.emit("recording-stopped", { fileName });
                }
              });
              
              delete recorder[fileName];
              delete recordingActive[fileName];
            }
          }, 1000);
        } catch (error: any) {
          console.error("Error in stop-stream-recording:", error);
          socket.emit("recording-error", { 
            error: error.message || "Unknown error" 
          });
        }
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(" Client disconnected:", socket.id, "- Reason:", reason);
      
      Object.keys(recorder).forEach((fileName) => {
        try {
          if (recorder[fileName]) {
            console.log("🧹 Cleaning up recording for disconnected client:", fileName);
            recorder[fileName].end();
            delete recorder[fileName];
            delete recordingActive[fileName];
          }
        } catch (error) {
          console.error(" Error cleaning up recorder:", error);
        }
      });
    });
  });

  httpsServer.listen(storageServerPort, () => {
    console.log(` Storage Server Running on port: ${storageServerPort}`);
    console.log(` Recordings directory: ${path.join(__dirname, "recordings")}`);
    console.log(` SSL enabled with HTTPS`);
  });

  httpsServer.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${storageServerPort} is already in use`);
    } else if (error.code === "EACCES") {
      console.error(`Permission denied to bind to port ${storageServerPort}`);
    } else {
      console.error("Server error:", error);
    }
    process.exit(1);
  });

  process.on("SIGINT", () => {
    console.log("\n Received SIGINT, shutting down gracefully...");
    httpsServer.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    console.log("\n Received SIGTERM, shutting down gracefully...");
    httpsServer.close(() => {
      console.log(" Server closed");
      process.exit(0);
    });
  });
};

startStorageSocketServer().catch((error) => {
  console.error(" Failed to start storage server:", error);
  process.exit(1);
});
