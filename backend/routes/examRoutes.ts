import {Router} from 'express';
import {createExam} from '../controllers/ExamAdminController';
const router =Router();

router.get('/exam',createExam);

export default router;