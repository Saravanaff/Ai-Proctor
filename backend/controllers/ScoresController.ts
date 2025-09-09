import { Request, Response } from "express";
import { calculateExamScore, getExamScore } from "../utils/calculate";
import Scores from "../models/Scores";
import { getUserIdFromToken } from "../utils/jwt";

export const getScoreInPercent = async (req: Request, res: Response) => {
  try {

    const { userId, examId } = req.query;

    if (!userId || !examId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId or examId in request body",
      });
    }

    const score = await Scores.findOne({
      where: {
        user_id: Number(Array.isArray(userId) ? userId[0] : userId),
        exam_id: Number(Array.isArray(examId) ? examId[0] : examId),
      },
    });

    if (!score) {
      return res.status(404).json({
        success: false,
        error: "Score not found",
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
        sound_flagged: score.sound_flagged,
        total_score: score.total_score,
      }
    });
  } catch ( err ) {
    console.log("Error While getScoreInPercent: ",err);
    return res.status(500).json({
      success: false,
      error: "Error while getting score in percentage",
    })
  }
};

export const putScoreInPercent = async (req: Request, res: Response) => {
  const { examId } = req.body;

  try {
    console.log("exam", req.body);
    const userId = getUserIdFromToken(req);

    console.log(userId);
    const flaggedScore = getExamScore(userId, examId);

    console.log("Getting Exam Score :", flaggedScore);

    if (!flaggedScore) {
      return res.status(404).json({
        success: false,
        error: "No score data found for the given user and exam",
      });
    }

    const calculatedScore = await calculateExamScore(flaggedScore);

    if (userId === null || userId === undefined) {
      return res.status(400).json({
        success: false,
        error: "Invalid userId",
      });
    }

    const scoreData = {
      user_id: userId,
      exam_id: examId,
      no_of_person_flagged: flaggedScore.noOfPersonFlagged || 0,
      no_person_flagged: flaggedScore.noPersonFlagged || 0,
      auth_face_flagged: flaggedScore.authFaceFlagged || 0,
      head_position_flagged: flaggedScore.headPositionFlagged || 0,
      eyes_flagged: flaggedScore.eyesFlagged || 0,
      object_detected_flagged: flaggedScore.objectDetectedFlagged || 0,
      total_images_processed: flaggedScore.totalImagesProcessed || 0,
      sound_flagged: flaggedScore.soundFlagged || 0,
      total_score: calculatedScore.cheatingPercentage || 0,
    };

    const existingScore = await Scores.findOne({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    if (!existingScore) {
      await Scores.create(scoreData as any);
    } else {
      return res.status(401).json({
        success: false,
        message: "User with Exam already exists"
      })
    }
    // else {
    //   await Scores.create(scoreData as any);
    // }

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
      error: "Failed to save score Error Occured",
    });
  }
};
