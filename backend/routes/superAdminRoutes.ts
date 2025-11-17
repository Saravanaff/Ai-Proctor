import { Router } from "express";
import {
  getAdminEmails,
  getExaminerEmails,
  getAdminExams,
  deleteAdmin,
  createAdminWithoutPassword,
  bulkCreateAdmins,
} from "../controllers/SuperController";
import { requireAdminRole } from "../middleware/roleMiddleware";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

// Get all admin emails
router.get("/admin/emails", getAdminEmails);

// Get all examiner emails
router.get("/examiner/emails", getExaminerEmails);

// Get all exams created by a specific admin
router.get("/admin/:adminEmail/exams",getAdminExams);

// Create admin without password
router.post("/admin/create", createAdminWithoutPassword);

// Bulk create admins from CSV
router.post("/admin/bulk-create", bulkCreateAdmins);

// Delete admin and all associated data
router.delete("/admin/:adminEmail",deleteAdmin);

export default router;
