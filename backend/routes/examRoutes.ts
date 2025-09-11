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
const router = Router();

router.get("/exam", requireExaminerRole, getExam);
router.get("/getExamSettings", getExamSettings);
router.get("/exam/:examId", requireExaminerRole, getSingleExam);
router.post("/examCreate", requireExaminerRole, createExam);
router.put("/exam/:examId", requireExaminerRole, updateExam);
router.delete("/exam/:examId", requireExaminerRole, deleteExam);

export default router;
