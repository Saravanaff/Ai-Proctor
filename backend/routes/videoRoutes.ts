import { Router } from "express";
import { downloadVideo, streamVideo } from "../controllers/VideoController";
import authMiddleware from "../middleware/authMiddleware";
import { requireExaminerRole } from "../middleware/roleMiddleware";

const router = Router();

// Handle preflight requests for CORS
router.options("/stream-video/:user_id/:exam_id/:category", (req, res) => {
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

// HEAD request for video availability check
router.head(
  "/stream-video/:user_id/:exam_id/:category",
  authMiddleware,
  streamVideo
);

// Stream video route - requires authentication
router.get(
  "/stream-video/:user_id/:exam_id/:category",
  authMiddleware,
  streamVideo
);

// Download video route - requires authentication and examiner role
router.get("/download-video/:user_id/:exam_id/:category", downloadVideo);

export default router;
