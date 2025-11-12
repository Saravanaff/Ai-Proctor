import { Router } from "express";
import {
  createExam,
  getExams,
  getSingleExam,
  updateExam,
  deleteExam,
  getCandidates,
} from "../controllers/ExamController";
import {
  getExamSettings,
} from "../controllers/CandidateController";
import {
  saveUserAnswers,
  getUserAnswersByAdmin,
} from "../controllers/AnswerController";
import {
  getExamResults,
} from "../controllers/ResultsController";
import {
  requireExaminerRole,
  requireStudentRole,
} from "../middleware/roleMiddleware";
import {
  getQuestionsByExam,
  updateQuestionsForExam,
} from "../controllers/QuestionController";

const router = Router();

// Exam routes
router.get("/exam", getExams);
router.get("/exam/:examId", getSingleExam);
router.post("/examCreate", createExam);
router.put("/exam/:examId", updateExam);
router.delete("/exam/:examId", deleteExam);
router.post("/getCandidates", getCandidates);

// Candidate routes
router.get("/getExamSettings", getExamSettings);

// Question routes
router.get("/getExamQuestions/:examId", getQuestionsByExam);
router.put("/updateExamQuestions/:exam_id", updateQuestionsForExam);

// Answer routes
router.post("/saveUserAnswers", saveUserAnswers);
router.get("/exam/:examId/candidate/:candidateUserId/answers", getUserAnswersByAdmin);

// Results routes
router.get("/exam/:examId/results", getExamResults);

export default router;
