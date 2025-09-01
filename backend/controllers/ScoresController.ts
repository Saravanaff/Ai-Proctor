import { Request, Response } from "express";
import { calculateExamScore, getExamScore } from "../utils/calculate";
import Scores from "../models/Scores";

export const getScoreInPercent = async (req: Request, res: Response) => {
  const { userId, examId } = req.body;
  console.log("ususu", userId, examId);
  
  const score = await Scores.findOne({
    where: {
      user_id: userId,
      exam_id: examId,
    },
  });

  console.log("Success");

  if (!score) {
    return res.status(404).json({ 
      success: false,
      error: "Score not found" 
    });
  }

  res.status(200).json({
    success: true,
    data: score.total_score,
    scoreBreakdown: {
      no_of_person_flagged: score.no_of_person_flagged,
      no_person_flagged: score.no_person_flagged,
      auth_face_flagged: score.auth_face_flagged,
      head_position_flagged: score.head_position_flagged,
      eyes_flagged: score.eyes_flagged,
      object_detected_flagged: score.object_detected_flagged,
      total_score: score.total_score,
    }
  });
};

export const putScoreInPercent = async (req: Request, res: Response) => {
  const { userId, examId } = req.body;

  try {
    const flaggedScore = getExamScore(userId, examId);

    if (!flaggedScore) {
      return res.status(404).json({
        success: false,
        error: "No score data found for the given user and exam",
      });
    }

    const calculatedScore = await calculateExamScore(flaggedScore);

    const existingScore = await Scores.findOne({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    const scoreData = {
      user_id: userId,
      exam_id: examId,
      no_of_person_flagged: flaggedScore.noOfPersonFlagged || 0,
      no_person_flagged: flaggedScore.noPersonFlagged || 0,
      auth_face_flagged: flaggedScore.authFaceFlagged || 0,
      head_position_flagged: flaggedScore.headPositionFlagged || 0,
      eyes_flagged: flaggedScore.eyesFlagged || 0,
      object_detected_flagged: flaggedScore.objectDetectedFlagged || 0,
      total_score: calculatedScore.cheatingPercentage,
    };

    if (existingScore) {
      await existingScore.update(scoreData);
    } else {
      await Scores.create({
        user_id: userId,
        exam_id: examId,
        no_of_person_flagged: flaggedScore.noOfPersonFlagged || 0,
        no_person_flagged: flaggedScore.noPersonFlagged || 0,
        auth_face_flagged: flaggedScore.authFaceFlagged || 0,
        head_position_flagged: flaggedScore.headPositionFlagged || 0,
        eyes_flagged: flaggedScore.eyesFlagged || 0,
        object_detected_flagged: flaggedScore.objectDetectedFlagged || 0,
        total_score: calculatedScore.cheatingPercentage,
      } as any);
    }

    res.status(200).json({
      success: true,
      message: "Score saved successfully",
      data: {
        userId,
        examId,
        flaggedData: flaggedScore,
        calculatedScore: calculatedScore,
        savedScore: scoreData,
      },
    });
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save score",
    });
  }
};
