import {Router} from 'express';
import {createExam, getExam} from '../controllers/ExamAdminController';
const router =Router();

router.get('/exam',getExam);
router.post('/examCreate',createExam);

export default router;