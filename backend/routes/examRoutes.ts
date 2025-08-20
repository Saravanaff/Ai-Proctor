import {Router} from 'express';
import {createExam, getExam} from '../controllers/ExamAdminController';
import {requireExaminerRole} from '../middleware/roleMiddleware';
const router =Router();

router.get('/exam', requireExaminerRole, getExam);
router.post('/examCreate', requireExaminerRole, createExam);

export default router;