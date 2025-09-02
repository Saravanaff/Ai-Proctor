import {Router} from 'express';
import { createExam, getExam, getSingleExam, getExamSettings } from '../controllers/ExamAdminController';
import {requireExaminerRole} from '../middleware/roleMiddleware';
const router =Router();

router.get('/exam', requireExaminerRole, getExam);
router.get('/getExamSettings',requireExaminerRole, getExamSettings)
router.get('/exam/:examId', requireExaminerRole, getSingleExam);
router.post('/examCreate', requireExaminerRole, createExam);

export default router;