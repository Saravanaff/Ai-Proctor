import { Request,Response } from "express";
import express from 'express';
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";

export const createExam=async(req:Request,res:Response)=>{
    try{
        const {exam_name,user_id}=req.body;
        if(!exam_name){
            res.status(400).json({
                success:false,
                message:"Exam name has not been came"
            });
        }
        const lastExam=await Exam.findOne({
            order:[['key','DESC']]
        });
        let nextKey=100000;
        if(lastExam && lastExam.key){
            nextKey=Number(lastExam.key)+1;
            if(nextKey>999999)nextKey=100000;
        }

        const newExam=await Exam.create({
            user_id,
            exam_name,
            key:nextKey
        })

        res.status(201).json({
            success:true,
            message:"Exam Created Successfully",
            key:nextKey
        });
    }
    catch(err:any){
        res.status(500).json({
            success:false,
            message:"Error Creating exam",
            error:err.message
        });
    }
    
}

export const getExam = async (req: Request, res: Response) => {
    const { user_id } = req.body;
    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        const exams = await Exam.findAll({
            where: { user_id },
            attributes: ['exam_name']
        });
        res.status(200).json({
            success: true,
            message: "Exam names fetched successfully",
            exams
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching exams",
            error: err.message
        });
    }
}

export const getCanditates = async (req: Request, res: Response) => {
    const { exam_id } = req.body;
    if (!exam_id) {
        return res.status(400).json({
            success: false,
            message: "Exam ID is required"
        });
    }
    try {
        const candidates = await Attend.findAll({
            where: { exam_id },
            attributes: ['user_id', 'user_name']
        });
        res.status(200).json({
            success: true,
            message: "Candidates fetched successfully",
            candidates
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching candidates",
            error: err.message
        });
    }
};

