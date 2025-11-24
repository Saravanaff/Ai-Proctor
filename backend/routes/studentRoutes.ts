import { Router } from 'express';
import { joinExam } from '../controllers/StudentController';
import { requireRole } from '../middleware/roleMiddleware';
import { validateExam } from '../controllers/ExamCanditateController';

const router = Router();

router.post('/joinExam', requireRole('student'), joinExam);


export default router;