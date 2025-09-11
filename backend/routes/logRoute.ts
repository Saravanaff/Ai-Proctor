import express from 'express';
import { getExamLogs } from '../controllers/LogController';

const router = express.Router();


router.get('/getLogs', getExamLogs);

export default router;
