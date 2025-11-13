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

router.get("/getScore",requireExaminerRole,getScoreInPercent);

router.post("/saveScore",requireStudentRole, putScoreInPercent);

router.post("/setMicrophone", requireStudentRole,setMicrophoneCount);

router.post("/updateTabSwitch", requireStudentRole,updateTabSwitch);

export default router;