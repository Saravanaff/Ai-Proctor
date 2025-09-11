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
        tab_switch_violation: score.tab_switch_violation,
        number_of_microphone: score.number_of_microphone,
        screen_sharing: score.screen_sharing,
        safe_browser: score.safe_browser,
        control_desktop_apps: score.control_desktop_apps,
        blank_feed: score.blank_feed,
        total_score: score.total_score,
      },
    });
  } catch (err) {
    console.log("Error While getScoreInPercent: ", err);
    return res.status(500).json({
      success: false,
      error: "Error while getting score in percentage",
    });
  }
};

export const putScoreInPercent = async (req: Request, res: Response) => {
  const { examId, userId, numberOfMicrophones, tabSwitchViolations } = req.body;

  try {
    console.log("exam", req.body);

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
      number_of_microphone: numberOfMicrophones || 0,
      tab_switch_violation: tabSwitchViolations || 0,
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
      await existingScore.update(scoreData);
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
      error: "Failed to save score Error Occured",
    });
  }
};

export const setMicrophoneCount = async (req: Request, res: Response) => {
  const { userId, examId, microphoneCount } = req.body;

  try {
    // Validate required parameters
    if (
      !userId ||
      !examId ||
      microphoneCount === undefined ||
      microphoneCount === null
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: userId, examId, or microphoneCount",
      });
    }

    // Find existing score record
    const existingScore = await Scores.findOne({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
    });

    if (existingScore) {
      // Update existing record
      await existingScore.update({
        number_of_microphone: microphoneCount,
      });

      res.status(200).json({
        success: true,
        message: "Microphone count updated successfully",
        data: {
          userId: Number(userId),
          examId: Number(examId),
          microphoneCount: microphoneCount,
        },
      });
    } else {
      // Create new score record with microphone count
      const newScore = await Scores.create({
        user_id: Number(userId),
        exam_id: Number(examId),
        number_of_microphone: microphoneCount,
        no_of_person_flagged: 0,
        no_person_flagged: 0,
        auth_face_flagged: 0,
        head_position_flagged: 0,
        eyes_flagged: 0,
        object_detected_flagged: 0,
        total_images_processed: 0,
        sound_flagged: 0,
        tab_swithch_violation: 0,
        total_score: 0,
      } as any);

      res.status(201).json({
        success: true,
        message: "Score record created with microphone count",
        data: {
          userId: Number(userId),
          examId: Number(examId),
          microphoneCount: microphoneCount,
        },
      });
    }
  } catch (error) {
    console.error("Error setting microphone count:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set microphone count",
    });
  }
};

export const updateTabSwitch = async (req: Request, res: Response) => {
  const { userId, examId, tabSwitchCount } = req.body;

  try {
    // Validate required parameters
    if (
      !userId ||
      !examId ||
      tabSwitchCount === undefined ||
      tabSwitchCount === null
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: userId, examId, or tabSwitchCount",
      });
    }

    // Find existing score record
    const existingScore = await Scores.findOne({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
    });

    if (existingScore) {
      // Update existing record
      await existingScore.update({
        tab_switch_violation: Number(tabSwitchCount),
      });

      res.status(200).json({
        success: true,
        message: "Tab switch count updated successfully",
        data: {
          userId: Number(userId),
          examId: Number(examId),
          tabSwitchCount: Number(tabSwitchCount),
        },
      });
    } else {
      // Create new score record with tab switch count
      const newScore = await Scores.create({
        user_id: Number(userId),
        exam_id: Number(examId),
        tab_swithch_violation: Number(tabSwitchCount),
        no_of_person_flagged: 0,
        no_person_flagged: 0,
        auth_face_flagged: 0,
        head_position_flagged: 0,
        eyes_flagged: 0,
        object_detected_flagged: 0,
        total_images_processed: 0,
        sound_flagged: 0,
        number_of_microphone: 0,
        total_score: 0,
      } as any);

      res.status(201).json({
        success: true,
        message: "Score record created with tab switch count",
        data: {
          userId: Number(userId),
          examId: Number(examId),
          tabSwitchCount: Number(tabSwitchCount),
        },
      });
    }
  } catch (error) {
    console.error("Error updating tab switch count:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update tab switch count",
    });
  }
};
