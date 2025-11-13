import { Router } from "express";
import { login, register } from "../controllers/AuthController";
import { uploadPhoto } from "../middleware/uploadPhoto";
import { requireStudentRole } from "../middleware/roleMiddleware";

const router = Router();

router.post(["/login", "/Login"], login as any);
router.post("/register", uploadPhoto, register as any);

export default router;
