import { Router } from "express";
import {
  getScoreInPercent,
} from "../controllers/ResultsController";
import {
  putScoreInPercent,
  setMicrophoneCount,
  updateTabSwitch,
} from "../controllers/ScoresController";
import authMiddleware from "../middleware/authMiddleware";
import {
  requireExaminerRole,
  requireStudentRole,
} from "../middleware/roleMiddleware";

const router = Router();

// Get score for a specific user and exam
router.get("/score/:userId/:examId", requireExaminerRole, getScoreInPercent);

router.post("/saveScore", putScoreInPercent);

// router.post("/setMicrophone", requireStudentRole, setMicrophoneCount);

// router.post("/updateTabSwitch", requireStudentRole, updateTabSwitch);

export default router;
