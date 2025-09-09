import { Router } from "express";
import { downloadVideo } from "../controllers/downloadController";

const router = Router();

// Download a specific video
router.get("/download/:userId/:examId", downloadVideo);

export default router;
