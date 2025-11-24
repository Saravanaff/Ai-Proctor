import { Request, Response } from "express";
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";
import { getUserIdFromToken } from '../utils/jwt';

export const joinExam = async (req: Request, res: Response) => {
    try {
        const { exam_key } = req.body;
        const user_id = getUserIdFromToken(req);

        if (!exam_key || !user_id) {
            return res.status(400).json({
                success: false,
                message: "Exam key and user authentication required"
            });
        }

        const exam = await Exam.findOne({
            where: { key: exam_key }
        });

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Invalid exam key. Please check and try again."
            });
        }

         const now = new Date();
         console.log(now,exam.start_time);
        if (exam.start_time && new Date(exam.start_time) > now) {
        return res.status(403).json({
            success: false,
            message: "Exam has not started yet",
        });
        }

        if (exam.end_time && new Date(exam.end_time) < now) {
        return res.status(403).json({
            success: false,
            message: "Exam has ended",
        });
        }
        const existingAttendance = await Attend.findOne({
            where: { 
                exam_id: exam.id,
                user_id: user_id 
            }
        });

        if (existingAttendance) {
            return res.status(409).json({
                success: false,
                message: "You are already registered for this exam"
            });
        }

        await Attend.create({
            exam_id: exam.id,
            user_id: user_id,
        });

        res.status(200).json({
            success: true,
            message: "Successfully joined the exam",
            exam: {
                id: exam.id,
                name: exam.exam_name,
                key: exam.key
            }
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Error joining exam",
            error: err.message
        });
    }
};