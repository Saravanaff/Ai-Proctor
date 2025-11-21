import { Router } from "express";
import {
  getAdminEmails,
  getExaminerEmails,
  getAdminExams,
  deleteAdmin,
  toggleAdminStatus,
  createAdminWithoutPassword,
  bulkCreateAdmins,
  getAllStudents,
  getStudentExams,
} from "../controllers/SuperController";
import { requireAdminRole } from "../middleware/roleMiddleware";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

// Get all admin emails
router.get("/admin/emails", getAdminEmails);

// Get all examiner emails
router.get("/examiner/emails", getExaminerEmails);

// Get all students
router.get("/admin/students", getAllStudents);

// Get all exams attended by a specific student
router.get("/admin/student/:studentId/exams", getStudentExams);

// Get all exams created by a specific admin
router.get("/admin/:adminEmail/exams",getAdminExams);

// Create admin without password
router.post("/admin/create", createAdminWithoutPassword);

// Bulk create admins from CSV
router.post("/admin/bulk-create", bulkCreateAdmins);

// Toggle admin status (suspend/activate)
router.patch("/admin/:adminEmail/status", toggleAdminStatus);

// Delete admin and all associated data
router.delete("/admin/:adminEmail",deleteAdmin);

export default router;
