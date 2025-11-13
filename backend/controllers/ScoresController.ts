import { Request, Response } from "express";
import { calculateExamScore, getExamScore } from "../utils/calculate";
import Scores from "../models/Scores";
import { ViolationLog } from "../models/ViolationLog";
import { Attend } from "../models/Attend";
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
    console.log("Processing score for exam:", req.body);

    // Validate userId and examId
    if (userId === null || userId === undefined) {
      return res.status(400).json({
        success: false,
        error: "Invalid userId",
      });
    }

    if (examId === null || examId === undefined) {
      return res.status(400).json({
        success: false,
        error: "Invalid examId",
      });
    }

    // Fetch exam attendance record to get start and end time
    const attendRecord = await Attend.findOne({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    if (!attendRecord || !attendRecord.startTime || !attendRecord.endTime) {
      return res.status(404).json({
        success: false,
        error: "Attendance record not found or exam time not recorded",
      });
    }

    // Calculate exam duration in minutes
    const examDurationMs =
      new Date(attendRecord.endTime).getTime() -
      new Date(attendRecord.startTime).getTime();
    const examDurationMinutes = examDurationMs / (1000 * 60);

    console.log(`Exam duration: ${examDurationMinutes} minutes`);

    // Fetch all violation logs for this user and exam
    const violationLogs = await ViolationLog.findAll({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    console.log(
      `Found ${violationLogs.length} violation logs for user ${userId}, exam ${examId}`
    );

    // Define violation weights (higher weight = more severe violation)
    const violationWeights = {
      multiple_persons_detected: 10, // Critical: Multiple people helping
      face_auth_failed: 9, // Critical: Wrong person taking exam
      object_detection_violation: 8, // High: Using unauthorized materials/devices
      no_person_detected: 5, // Medium: Leaving exam area
      head_position_violation: 3, // Low: Looking away from screen
      eye_position_violation: 3, // Low: Eye movement away from screen
    };

    // Initialize violation counters
    const violationCounts = {
      no_of_person_flagged: 0,
      no_person_flagged: 0,
      auth_face_flagged: 0,
      head_position_flagged: 0,
      eyes_flagged: 0,
      object_detected_flagged: 0,
      sound_flagged: 0,
    };

    // Count violations by type and calculate weighted score
    let weightedViolationScore = 0;

    violationLogs.forEach((log) => {
      const violationType = log.violation_name;

      switch (violationType) {
        case "multiple_persons_detected":
          violationCounts.no_of_person_flagged++;
          weightedViolationScore += violationWeights.multiple_persons_detected;
          break;
        case "no_person_detected":
          violationCounts.no_person_flagged++;
          weightedViolationScore += violationWeights.no_person_detected;
          break;
        case "face_auth_failed":
          violationCounts.auth_face_flagged++;
          weightedViolationScore += violationWeights.face_auth_failed;
          break;
        case "head_position_violation":
          violationCounts.head_position_flagged++;
          weightedViolationScore += violationWeights.head_position_violation;
          break;
        case "eye_position_violation":
          violationCounts.eyes_flagged++;
          weightedViolationScore += violationWeights.eye_position_violation;
          break;
        case "object_detection_violation":
          violationCounts.object_detected_flagged++;
          weightedViolationScore += violationWeights.object_detection_violation;
          break;
        default:
          // Log unknown violation types for debugging
          console.log(`Unknown violation type: ${violationType}`);
          break;
      }
    });

    // Add weighted scores for tab switches and microphone violations
    const tabSwitchWeight = 7; // High severity
    const microphoneWeight = 4; // Medium severity

    weightedViolationScore += (tabSwitchViolations || 0) * tabSwitchWeight;
    weightedViolationScore += (numberOfMicrophones || 0) * microphoneWeight;

    // Calculate cheating percentage based on:
    // 1. Weighted violation score
    // 2. Exam duration (normalize violations per hour)
    // 3. Total violation count

    const totalViolations =
      Object.values(violationCounts).reduce((sum, count) => sum + count, 0) +
      (tabSwitchViolations || 0);

    // Calculate violations per hour to normalize across different exam durations
    const violationsPerHour =
      examDurationMinutes > 0
        ? (totalViolations / examDurationMinutes) * 60
        : 0;

    // Calculate weighted score per hour
    const weightedScorePerHour =
      examDurationMinutes > 0
        ? (weightedViolationScore / examDurationMinutes) * 60
        : 0;

    // Calculate cheating percentage (0-100 scale)
    // Formula: Consider both frequency and severity
    // Normalize to 100 scale: assume 20 weighted violations per hour = 100% cheating
    const maxWeightedScorePerHour = 20;
    let cheatingPercentage = Math.min(
      Math.round((weightedScorePerHour / maxWeightedScorePerHour) * 100),
      100
    );

    // If there are critical violations (multiple persons, face auth failed), ensure minimum 50% cheating score
    if (
      violationCounts.no_of_person_flagged > 0 ||
      violationCounts.auth_face_flagged > 0
    ) {
      cheatingPercentage = Math.max(cheatingPercentage, 50);
    }

    console.log({
      totalViolations,
      weightedViolationScore,
      examDurationMinutes,
      violationsPerHour: violationsPerHour.toFixed(2),
      weightedScorePerHour: weightedScorePerHour.toFixed(2),
      cheatingPercentage,
    });

    // Prepare score data for database
    const scoreData = {
      user_id: userId,
      exam_id: examId,
      no_of_person_flagged: violationCounts.no_of_person_flagged,
      no_person_flagged: violationCounts.no_person_flagged,
      auth_face_flagged: violationCounts.auth_face_flagged,
      head_position_flagged: violationCounts.head_position_flagged,
      eyes_flagged: violationCounts.eyes_flagged,
      object_detected_flagged: violationCounts.object_detected_flagged,
      total_images_processed: violationLogs.length,
      sound_flagged: violationCounts.sound_flagged,
      number_of_microphone: numberOfMicrophones || 0,
      tab_switch_violation: tabSwitchViolations || 0,
      total_score: cheatingPercentage,
    };

    console.log("Calculated score data:", scoreData);

    // Check if score record already exists
    const existingScore = await Scores.findOne({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    if (!existingScore) {
      // Create new score record
      await Scores.create(scoreData as any);
      console.log("Created new score record");
    } else {
      // Update existing score record
      await existingScore.update(scoreData);
      console.log("Updated existing score record");
    }

    res.status(200).json({
      success: true,
      message: "Score calculated and saved successfully",
      timestamp: new Date().toISOString(),
      data: {
        userId,
        examId,
        examDuration: {
          startTime: attendRecord.startTime,
          endTime: attendRecord.endTime,
          durationMinutes: Math.round(examDurationMinutes),
        },
        violationCounts,
        violationWeights,
        analytics: {
          totalViolations,
          weightedViolationScore,
          violationsPerHour: parseFloat(violationsPerHour.toFixed(2)),
          weightedScorePerHour: parseFloat(weightedScorePerHour.toFixed(2)),
        },
        cheatingPercentage,
        savedScore: scoreData,
      },
    });
  } catch (error) {
    console.error("Error calculating and saving score:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate and save score",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const setMicrophoneCount = async (req: Request, res: Response) => {
  const { userId, examId, microphoneCount } = req.body;

  try {
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
