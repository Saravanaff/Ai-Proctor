import "reflect-metadata";
import express from "express";
import { createServer as createHttpsServer } from "https";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { sequelize } from "./db";
import authRoutes from "./routes/authRoutes";
import authMiddleware from "./middleware/authMiddleware";
import { initSocket } from "./sockets";
import examRoutes from "./routes/examRoutes";
import studentRoutes from "./routes/studentRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import videoRoutes from "./routes/videoRoutes";
import logRoute from "./routes/logRoute";
import generatorRoute from "./routes/generatorRoutes";
import otpRoutes from "./routes/otpRoutes";
import superAdminRoutes from "./routes/superAdminRoutes";
import fs from "fs";

dotenv.config({ path: path.join(__dirname, ".env") });

const serverPort = 3001;

async function startServer() {
  const app = express();

  app.use(
    cors({
      origin: "*",
      credentials: false,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (req, res) => {
    res.send("DVD");
  });

  app.get("/ca", (req, res) => {
    const caPath = path.join(__dirname, "rootCA.pem");
    res.setHeader("Content-Type", "application/x-pem-file");
    res.download(caPath, "rootCA.pem");
  });
  app.use("/uploads", express.static(path.join(process.cwd(), "..", "uploads")));
  app.use("/", authRoutes);
  app.use("/otp", otpRoutes);
  app.use("/api/video", videoRoutes);
  app.use(authMiddleware);
  app.use("/", superAdminRoutes);
  app.use("/", examRoutes);
  app.use("/", studentRoutes);
  app.use("/", scoreRoutes);
  app.use("/", logRoute);
  app.use("/", generatorRoute);

  const key = fs.readFileSync(path.join(__dirname, "localhost-key.pem"));
  const cert = fs.readFileSync(path.join(__dirname, "localhost-cert.pem"));
  const ca = fs.readFileSync(path.join(__dirname, "rootCA.pem"));

  const httpsServer = createHttpsServer({ key, cert, ca }, app);

  initSocket(httpsServer);

  httpsServer.listen(serverPort, () => {
    console.log(`✅ HTTP Socket.IO server running at ${serverPort}`);
  });
}

(async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await startServer();
})().catch(console.error);
