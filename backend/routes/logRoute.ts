import express from 'express';
import { getExamLogs } from '../controllers/LogController';

const router = express.Router();

/**
 * GET /logs/:examId
 * Get all violation logs for the authenticated user in a specific exam
 */
router.get('/getLogs', getExamLogs);

export default router;
