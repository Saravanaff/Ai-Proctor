import { Router } from 'express';
import { joinExam, validateExam } from '../controllers/CandidateController';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// Student/Candidate routes
router.post('/validateExam', validateExam);
router.post('/joinExam', requireRole('student'), joinExam);

export default router;