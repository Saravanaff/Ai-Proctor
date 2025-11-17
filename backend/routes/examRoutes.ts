import { Router } from "express";
import {
  createExam,
  getExam,
  getSingleExam,
  updateExam,
  deleteExam,
  getExamResults,
  getStudentAnswers
} from "../controllers/ExamAdminController";
import {
  getExamSettings,
  saveUserAnswers,
} from "../controllers/ExamCanditateController";
import {
  requireExaminerRole,
  requireStudentRole,
} from "../middleware/roleMiddleware";
import {
  getQuestionsByExam,
  updateQuestionsForExam,
} from "../controllers/QuestionController";
import { requireAdminRole } from "../middleware/roleMiddleware";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.get("/exam", authMiddleware, requireExaminerRole, getExam);
router.get("/getExamSettings", getExamSettings);
router.get("/exam/:examId", getSingleExam);
router.post("/examCreate", authMiddleware, requireExaminerRole, createExam);
router.put("/exam/:examId", authMiddleware, requireExaminerRole, updateExam);
router.delete("/exam/:examId", authMiddleware, requireExaminerRole, deleteExam);
router.get("/getExamQuestions/:examId", getQuestionsByExam);
router.put("/updateExamQuestions/:exam_id", authMiddleware, requireExaminerRole, updateQuestionsForExam);

router.post("/saveUserAnswers", authMiddleware, requireStudentRole, saveUserAnswers);

router.get("/exam/:examId/results", getExamResults);
router.get("/exam/:examId/student/:userId/answers", getStudentAnswers);

export default router;
