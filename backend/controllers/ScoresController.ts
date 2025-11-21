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

    if (!attendRecord) {
      return res.status(404).json({
        success: false,
        error: "Attendance record not found",
      });
    }

    // ✅ If endTime is not set, set it now (exam just ended)
    if (!attendRecord.endTime) {
      attendRecord.endTime = new Date();
      await attendRecord.save();
      console.log("Set exam endTime to:", attendRecord.endTime);
    }

    // ✅ If startTime is not set, use creation time as fallback
    if (!attendRecord.startTime) {
      attendRecord.startTime = attendRecord.createdAt;
      await attendRecord.save();
      console.log("Set exam startTime to:", attendRecord.startTime);
    }

    // Calculate exam duration in minutes
    const startTime = attendRecord.startTime || attendRecord.createdAt;
    const endTime = attendRecord.endTime || new Date();
    
    const examDurationMs = endTime.getTime() - startTime.getTime();
    const examDurationMinutes = Math.max(examDurationMs / (1000 * 60), 1); // ✅ Minimum 1 minute

    console.log(`Exam duration: ${examDurationMinutes.toFixed(2)} minutes`);

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

    // ✅ Define violation weights as per requirement
    const violationWeights = {
      head_position_violation: 1,    // Head movement
      eye_position_violation: 0.5,     // Eye movement
      object_detection_violation: 1.0, // Object detected
      face_auth_failed: 1.0,           // Face authentication failed
      multiple_persons_detected: 1.0,  // Multiple persons
      no_person_detected: 1,         // No person detected
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

    // Count violations by type and calculate total weighted flags
    let totalWeightedFlags = 0;

    violationLogs.forEach((log) => {
      const violationType = log.violation_name;

      switch (violationType) {
        case "multiple_persons_detected":
          violationCounts.no_of_person_flagged++;
          totalWeightedFlags += violationWeights.multiple_persons_detected;
          break;
        case "no_person_detected":
          violationCounts.no_person_flagged++;
          totalWeightedFlags += violationWeights.no_person_detected;
          break;
        case "face_auth_failed":
          violationCounts.auth_face_flagged++;
          totalWeightedFlags += violationWeights.face_auth_failed;
          break;
        case "head_position_violation":
          violationCounts.head_position_flagged++;
          totalWeightedFlags += violationWeights.head_position_violation;
          break;
        case "eye_position_violation":
          violationCounts.eyes_flagged++;
          totalWeightedFlags += violationWeights.eye_position_violation;
          break;
        case "object_detection_violation":
          violationCounts.object_detected_flagged++;
          totalWeightedFlags += violationWeights.object_detection_violation;
          break;
        default:
          console.log(`Unknown violation type: ${violationType}`);
          break;
      }
    });

    // ✅ Calculate risk score based on total weighted flags
    // Low Risk: 0-30% (below 6 weighted flags)
    // Medium Risk: 31-60% (6-10 weighted flags)
    // High Risk: 61-100% (above 10 weighted flags)
    
    let riskScore = 0;
    let riskLevel = "Low";

    if (totalWeightedFlags < 6) {
      // Low Risk: 0-30%
      riskScore = Math.min(Math.round((totalWeightedFlags / 6) * 30), 30);
      riskLevel = "Low";
    } else if (totalWeightedFlags <= 10) {
      // Medium Risk: 31-60%
      riskScore = Math.min(Math.round(30 + ((totalWeightedFlags - 6) / 4) * 30), 60);
      riskLevel = "Medium";
    } else {
      // High Risk: 61-100%
      riskScore = Math.min(Math.round(60 + ((totalWeightedFlags - 10) / 15) * 40), 100);
      riskLevel = "High";
    }

    console.log({
      totalWeightedFlags: totalWeightedFlags.toFixed(2),
      riskScore,
      riskLevel,
      violationCounts,
    });

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
      total_score: riskScore,
    };

    console.log("Calculated score data:", scoreData);

    const existingScore = await Scores.findOne({
      where: {
        user_id: userId,
        exam_id: examId,
      },
    });

    if (!existingScore) {
      await Scores.create(scoreData as any);
      console.log("Created new score record");
    } else {
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
          startTime: startTime,
          endTime: endTime,
          durationMinutes: Math.round(examDurationMinutes),
        },
        violationCounts,
        violationWeights,
        analytics: {
          totalWeightedFlags: parseFloat(totalWeightedFlags.toFixed(2)),
          riskLevel,
        },
        riskScore,
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

    const existingScore = await Scores.findOne({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
    });

    if (existingScore) {
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

    const existingScore = await Scores.findOne({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
    });

    if (existingScore) {
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
