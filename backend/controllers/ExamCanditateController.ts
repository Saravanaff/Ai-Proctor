import { Attend } from "../models/Attend";
import { Exam } from "../models/Exam";
import { Request, Response } from "express";

export const validateExam = async (req: Request, res: Response) => {
    const { key, user_id, user_name } = req.body;

    if (!key || !user_id || !user_name) {
        return res.status(400).json({
            success: false,
            message: "Exam key, user ID, and user name are required"
        });
    }

    try {
        const exam = await Exam.findOne({ where: { key } });
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Invalid exam key"
            });
        }

        await Attend.create({
            user_id,
            exam_id: exam.id,
        });

        res.status(200).json({
            success: true,
            message: "Exam validated and attendance recorded",
            exam_id:exam.id
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Error validating exam",
            error: err.message
        });
    }
};
