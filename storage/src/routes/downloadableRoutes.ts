import { Router } from "express";
import { downloadVideo, streamVideo } from "../controllers/downloadController";

const router = Router();

// Handle preflight requests for CORS
router.options("/stream/:user_id/:exam_id/:category", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Range, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Range, Content-Length, Accept-Ranges"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(200).end();
});

// Stream a specific video (for HTML5 video player)
router.get("/stream/:user_id/:exam_id/:category", streamVideo);

// Download a specific video
router.get("/download/:user_id/:exam_id/:category", downloadVideo);

export default router;
