import express from "express";
import { generateQuestionsFromText, testLLMConnection } from "../controllers/GeneratorController";

const router = express.Router();

// Generate questions from PDF text
router.post("/generate-questions", generateQuestionsFromText);

// Test LLM connection
router.get("/test-llm", testLLMConnection);

export default router;
