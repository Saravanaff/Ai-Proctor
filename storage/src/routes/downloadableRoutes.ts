import { Router } from "express";
import { downloadVideo } from "../controllers/downloadController";

const router = Router();

// Download a specific video
router.get("/download/:user_id/:exam_id/:category", downloadVideo);

export default router;
