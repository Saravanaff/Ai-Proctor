import { Router } from "express";
import { downloadVideo } from "../controllers/downloadController";

const router = Router();

// Download a specific video
router.get("/download/:user_id/:user_id/:category", downloadVideo);

export default router;
