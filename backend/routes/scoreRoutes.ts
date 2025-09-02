import { Router } from "express";
import {
  getScoreInPercent,
  putScoreInPercent,
} from "../controllers/ScoresController";
import authMiddleware from "../middleware/authMiddleware";
import { requireExaminerRole,requireStudentRole } from "../middleware/roleMiddleware";


const router = Router();

router.get("/getScore",requireExaminerRole,getScoreInPercent);

router.post("/saveScore",requireStudentRole,putScoreInPercent);

export default router;
