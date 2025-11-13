import express from "express";
import { generateQuestionsFromText, testLLMConnection } from "../controllers/GeneratorController";
import { requireAdminRole } from "../middleware/roleMiddleware";
import { requireExaminerRole } from "../middleware/roleMiddleware";

const router = express.Router();

router.post("/generate-questions",requireExaminerRole,generateQuestionsFromText);

router.get("/test-llm", testLLMConnection);

export default router;
