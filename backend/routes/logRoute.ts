import express from "express";
import { getExamLogs, storeExamLog } from "../controllers/LogController";

const router = express.Router();

/**
 * POST /logs/store
 * Store a new exam violation log
 */
router.post("/store", storeExamLog);

/**
 * GET /logs/getLogs
 * Get all violation logs for the authenticated user in a specific exam
 */
router.get("/getLogs", getExamLogs);

export default router;
