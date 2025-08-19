import "reflect-metadata";
import express from "express";
import { createServer as createHttpsServer } from "http";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { initMediasoup } from "./mediasoupServer"; // adjust path as needed
import { sequelize } from "./db";
import authRoutes from "./routes/authRoutes";
import authMiddleware from "./middleware/authMiddleware";
import { initSocket } from "./sockets";
import examRoutes from "./routes/examRoutes";

dotenv.config({ path: path.join(__dirname, ".env") });

const serverPort = 3001;

async function startServer() {
  const app = express();

  app.use(cors());

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

  app.use("/", authRoutes);
  app.use(authMiddleware);

  app.use("/",examRoutes);

  const httpsServer = createHttpsServer(app);

  // Initialize Socket.IO via module
  initSocket(httpsServer);

  httpsServer.listen(serverPort, () => {
    console.log(`✅ HTTP Socket.IO server running at ${serverPort}`);
  });
}

(async () => {
  await initMediasoup();
  await sequelize.authenticate();
  await sequelize.sync();
  await startServer();
})().catch(console.error);


