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

        // Find exam by key
        const exam = await Exam.findOne({
            where: { key: exam_key }
        });

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Invalid exam key. Please check and try again."
            });
        }

        // Check if student is already registered for this exam
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

        // Register student for the exam
        await Attend.create({
            exam_id: exam.id,
            user_id: user_id,
            // Add any other required fields like user_name if needed
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