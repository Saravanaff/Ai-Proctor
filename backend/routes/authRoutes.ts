import { Router } from "express";
import { login, register } from "../controllers/AuthController";
import { requireStudentRole } from "../middleware/roleMiddleware";

const router = Router();

router.post(["/login", "/Login"], login as any);
router.post("/register", register as any);

export default router;
