import { Router } from "express";
import {
  createExam,
  getExam,
  getSingleExam,
  updateExam,
  deleteExam,
} from "../controllers/ExamAdminController";
import { getExamSettings } from "../controllers/ExamCanditateController";
import {
  requireExaminerRole,
  requireStudentRole,
} from "../middleware/roleMiddleware";
import { getQuestionsByExam } from "../controllers/QuestionController";
const router = Router();

router.get("/exam", getExam);
router.get("/getExamSettings", getExamSettings);
router.get("/exam/:examId", getSingleExam);
router.post("/examCreate", createExam);
router.put("/exam/:examId", updateExam);
router.delete("/exam/:examId", deleteExam);
router.get("/getExamQuestions/:examId", getQuestionsByExam);

export default router;
