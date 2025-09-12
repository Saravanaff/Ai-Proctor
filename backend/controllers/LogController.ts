import { Request, Response } from 'express';
import { ViolationLog } from '../models/ViolationLog';
import { getUserIdFromToken } from '../utils/jwt';

export const getExamLogs=async(req: Request, res: Response)=> {
    try {
      const {examId,userId} = req.query;
      const examIdNum = examId;

      
      if (!userId || !examIdNum) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
    //   if (isNaN(examIdNum)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: 'Invalid exam ID'
    //     });
    //   }

      const logs = await ViolationLog.findAll({
        where: { 
          user_id: userId,
          exam_id: examIdNum
        },
        order: [['violation_timestamp', 'ASC']] // Chronological order for exam
      });

      console.log(logs);

      const summary: { [key: string]: number } = {};
      logs.forEach(log => {
        summary[log.violation_name] = (summary[log.violation_name] || 0) + 1;
      });

      res.json({
        success: true,
        data: logs,
        count: logs.length,
        summary
      });

    } 
    catch (error) {
      console.error('Error fetching user exam logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user exam logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
}