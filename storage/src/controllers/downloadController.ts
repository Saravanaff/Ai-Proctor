
import { Request, Response } from 'express';
import { generateFileName } from '../utils/utils';

export const downloadVideo = async (req : Request, res: Response) => {
    const { userId, examId } = req.params;

    const fileName = generateFileName(userId,examId);

    


    res.status(200);

}