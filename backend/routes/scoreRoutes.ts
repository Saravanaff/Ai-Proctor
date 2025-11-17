import { Router } from "express";
import {
  getScoreInPercent,
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

router.get("/getScore", authMiddleware, requireExaminerRole, getScoreInPercent);

router.post("/saveScore", authMiddleware, requireStudentRole, putScoreInPercent);

router.post("/setMicrophone", authMiddleware, requireStudentRole, setMicrophoneCount);

router.post("/updateTabSwitch", authMiddleware, requireStudentRole, updateTabSwitch);

export default router;