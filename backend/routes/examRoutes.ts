import { Router } from "express";
import {
  createExam,
  getExam,
  getSingleExam,
  updateExam,
  deleteExam,
  getExamResults,
} from "../controllers/ExamAdminController";
import {
  getExamSettings,
  saveUserAnswers,
  getUserAnswers,
} from "../controllers/ExamCanditateController";
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

// User answer routes
router.post("/saveUserAnswers", saveUserAnswers);
router.get("/getUserAnswers/:exam_id", getUserAnswers);

// Exam results route
router.get("/exam/:examId/results", getExamResults);

export default router;
