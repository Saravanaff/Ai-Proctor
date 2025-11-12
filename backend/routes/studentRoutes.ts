import { Router } from 'express';
import { joinExam } from '../controllers/StudentController';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// Student can join exam using exam key
router.post('/joinExam', requireRole('student'), joinExam);

export default router;