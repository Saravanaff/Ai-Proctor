import { Router } from "express";
import {
  createExam,
  getExam,
  getSingleExam,
  updateExam,
  updateExamStatus,
  deleteExam,
  getExamResults,
  getStudentAnswers,
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
router.get("/exam/:examId", requireExaminerRole, getSingleExam);
router.post("/examCreate", requireExaminerRole, createExam);
router.put("/exam/:examId", requireExaminerRole, updateExam);
router.put("/exam/:examId/status", requireExaminerRole, updateExamStatus);
router.delete("/exam/:examId", requireExaminerRole, deleteExam);
router.get("/getExamQuestions/:examId", getQuestionsByExam);
router.put(
  "/updateExamQuestions/:exam_id",
  requireExaminerRole,
  updateQuestionsForExam
);

router.post("/saveUserAnswers", requireStudentRole, saveUserAnswers);

router.get("/exam/:examId/results", getExamResults);
router.get("/exam/:examId/student/:userId/answers", getStudentAnswers);

export default router;
