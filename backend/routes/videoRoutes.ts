import { Router } from "express";
import { downloadVideo } from "../controllers/VideoController";
import authMiddleware from "../middleware/authMiddleware";
import { requireExaminerRole } from "../middleware/roleMiddleware";

const router = Router();

// Download video route - requires authentication and examiner role
router.get("/download-video/:user_id/:exam_id/:category", downloadVideo);

export default router;
