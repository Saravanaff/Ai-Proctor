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

interface ChunkQueue {
  [fileName: string]: {
    queue: Buffer[];
    processing: boolean;
    draining: boolean;
  };
}

const startStorageSocketServer = async () => {
  const app = express();

  // ✅ Global counters for monitoring (across all connections)
  let globalRecorderCount = 0;
  let globalQueueCount = 0;

  app.use(
    cors({
      origin: "*",
    })
  );

  app.get("/", (req, res) => {
    res.send("Storage Server Running");
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      activeStreams: globalRecorderCount,
      activeUsers: Math.floor(globalRecorderCount / 2),
      totalQueuedChunks: globalQueueCount
    });
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
    let chunkQueues: ChunkQueue = {}; // ✅ Queue system for backpressure handling

    // ✅ Process queued chunks with proper flow control
    const processChunkQueue = async (fileName: string) => {
      const queue = chunkQueues[fileName];
      
      if (!queue || queue.processing || queue.draining || queue.queue.length === 0) {
        return;
      }

      queue.processing = true;

      while (queue.queue.length > 0 && recorder[fileName] && recordingActive[fileName]) {
        const chunk = queue.queue.shift();
        
        if (!chunk) break;

        const stream = recorder[fileName];
        if (!stream) break; // ✅ Safety check

        const writeSuccess = stream.write(chunk);
        
        if (!writeSuccess) {
          // ✅ Backpressure detected - wait for drain before processing more
          queue.draining = true;
          console.warn(`⚠️ Backpressure detected for ${fileName} - ${queue.queue.length} chunks queued`);
          
          await new Promise<void>((resolve) => {
            stream.once('drain', () => {
              console.log(`✅ Buffer drained for ${fileName} - resuming (${queue.queue.length} chunks remaining)`);
              queue.draining = false;
              resolve();
            });
          });
        }
      }

      queue.processing = false;

      // ✅ Check if more chunks arrived while processing
      if (queue.queue.length > 0) {
        setImmediate(() => processChunkQueue(fileName));
      }
    };

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

          // ✅ Create WriteStream with larger buffer for better performance with many concurrent streams
          const writeStream = fs.createWriteStream(outputPath, {
            highWaterMark: 128 * 1024, // 128KB buffer (default is 16KB) - better for 100+ users
            flags: 'w'
          });
          
          writeStream.on("error", (error) => {
            console.error(" WriteStream error for", fileName, ":", error);
            delete recorder[fileName];
            delete recordingActive[fileName];
            delete chunkQueues[fileName];
            socket.emit("recording-error", { 
              fileName, 
              error: error.message 
            });
          });

          writeStream.on("finish", () => {
            console.log("✅ WriteStream finished for:", fileName);
          });

          recorder[fileName] = writeStream;
          recordingActive[fileName] = true;
          globalRecorderCount++; // ✅ Increment global counter
          
          // ✅ Initialize chunk queue for this recording
          chunkQueues[fileName] = {
            queue: [],
            processing: false,
            draining: false
          };
          
          // ✅ Log concurrent stream count for monitoring
          const activeStreams = Object.keys(recorder).length;
          console.log(` Recording started: ${outputPath}`);
          console.log(`📊 Active streams: ${activeStreams} (${activeStreams / 2} users) | Global: ${globalRecorderCount}`);
          
          // ⚠️ Warn if approaching file handle limits
          if (globalRecorderCount > 150) {
            console.warn(`⚠️ WARNING: ${globalRecorderCount} active streams - approaching system limits!`);
          }
          
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

          // ✅ Add chunk to queue instead of writing directly
          if (!chunkQueues[fileName]) {
            chunkQueues[fileName] = {
              queue: [],
              processing: false,
              draining: false
            };
          }

          chunkQueues[fileName].queue.push(buf);
          
          // ✅ Start processing if not already processing
          if (!chunkQueues[fileName].processing) {
            processChunkQueue(fileName);
          }

          // ✅ Monitor queue size (warn if queue gets too large)
          if (chunkQueues[fileName].queue.length > 10) {
            console.warn(`⚠️ Large queue detected for ${fileName}: ${chunkQueues[fileName].queue.length} chunks pending`);
          }
        } catch (error: any) {
          console.error("Error in add-video-stream-chunk:", error);
        }
      }
    );

    socket.on(
      "stop-stream-recording",
      (data: { user_id: string; exam_id: string; category: string; isFinal?: boolean; totalChunks?: number }) => {
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

          // ✅ DON'T set recordingActive to false - keep accepting chunks during graceful shutdown
          console.log("🛑 Stop signal received for:", fileName, `(isFinal: ${data.isFinal}, totalChunks: ${data.totalChunks})`);

          // ✅ Wait 3 seconds to ensure all in-flight chunks arrive (increased for backpressure)
          setTimeout(() => {
            if (recorder[fileName]) {
              const stream = recorder[fileName];
              
              // ✅ Check if stream is currently draining (backpressure)
              const checkAndClose = () => {
                if (stream.writableNeedDrain) {
                  console.log(`⏳ ${fileName} has pending writes, waiting for drain...`);
                  stream.once('drain', () => {
                    console.log(`✅ ${fileName} drained, now closing...`);
                    closeStream();
                  });
                } else {
                  console.log(`✅ ${fileName} buffer empty, closing immediately...`);
                  closeStream();
                }
              };
              
              const closeStream = () => {
                // ✅ NOW mark as inactive so no new chunks are accepted
                recordingActive[fileName] = false;
                
                // ✅ Wait for queue to fully drain before closing stream
                const waitForQueueDrain = () => {
                  if (chunkQueues[fileName] && chunkQueues[fileName].queue.length > 0) {
                    console.log(`⏳ Waiting for ${chunkQueues[fileName].queue.length} queued chunks to process...`);
                    setTimeout(waitForQueueDrain, 200);
                    return;
                  }
                  
                  console.log(`✅ All queued chunks processed for ${fileName}, closing stream...`);
                  
                  stream.end((error?: Error) => {
                    if (error) {
                      console.error("❌ Error closing WriteStream for", fileName, ":", error);
                    } else {
                      console.log("✅ Recording successfully ended:", fileName);
                      socket.emit("recording-stopped", { fileName });
                    }
                    
                    // ✅ Clean up AFTER stream is fully closed
                    delete recorder[fileName];
                    delete recordingActive[fileName];
                    delete chunkQueues[fileName]; // ✅ Clean up queue
                    globalRecorderCount--; // ✅ Decrement global counter
                    console.log(`📊 Global streams remaining: ${globalRecorderCount}`);
                  });
                };
                
                waitForQueueDrain();
              };
              
              checkAndClose();
            }
          }, 3000); // ✅ Increased to 3 seconds for heavy backpressure scenarios
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
            delete chunkQueues[fileName]; // ✅ Clean up queue on disconnect
            globalRecorderCount--; // ✅ Decrement global counter
          }
        } catch (error) {
          console.error(" Error cleaning up recorder:", error);
        }
      });
      
      console.log(`📊 Global streams after disconnect: ${globalRecorderCount}`);
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
