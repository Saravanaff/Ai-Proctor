import { Router } from "express";
import { 
  downloadVideo, 
  streamVideo, 
  getCandidateVideos, 
  getExamVideos 
} from "../controllers/VideoController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

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

router.get(
  "/candidate/:user_id/:exam_id",
  getCandidateVideos
);

router.get(
  "/exam/:exam_id",
  getExamVideos
);

router.head(
  "/stream/:user_id/:exam_id/:category",
  streamVideo
);

router.get(
  "/stream/:user_id/:exam_id/:category",
  streamVideo
);

router.get(
  "/download/:user_id/:exam_id/:category",
  downloadVideo
);

export default router;
