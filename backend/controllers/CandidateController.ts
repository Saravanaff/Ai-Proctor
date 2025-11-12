import { Request, Response } from "express";
import { Attend } from "../models/Attend";
import { Exam } from "../models/Exam";

export const validateExam = async (req: Request, res: Response) => {
  const { key, user_id, user_name } = req.body;

  if (!key || !user_id || !user_name) {
    return res.status(400).json({
      success: false,
      message: "Exam key, user ID, and user name are required",
    });
  }

  try {
    const exam = await Exam.findOne({ where: { key } });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Invalid exam key",
      });
    }

    await Attend.create({
      user_id,
      exam_id: exam.id,
    });

    res.status(200).json({
      success: true,
      message: "Exam validated and attendance recorded",
      exam_id: exam.id,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error validating exam",
      error: err.message,
    });
  }
};

export const joinExam = async (req: Request, res: Response) => {
  const { user_id, exam_id } = req.body;

  if (!user_id || !exam_id) {
    return res.status(400).json({
      success: false,
      message: "User ID and Exam ID are required",
    });
  }

  try {
    const existingAttendance = await Attend.findOne({
      where: { user_id, exam_id },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "You have already joined this exam",
      });
    }

    await Attend.create({
      user_id,
      exam_id,
    });

    res.status(200).json({
      success: true,
      message: "Successfully joined the exam",
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error joining exam",
      error: err.message,
    });
  }
};

// Get exam settings for a candidate
export const getExamSettings = async (req: Request, res: Response) => {
  try {
    console.log(req.query);
    const { examId, userId } = req.query;

    if (!examId || !userId) {
      return res.status(400).json({
        success: false,
        message: "examId or userId are Not Found",
      });
    }

    const exam = await Exam.findOne({
      where: {
        id: Number(examId),
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found for specific examId and userId",
      });
    }

    const {
      third_eye_enabled,
      multiple_person_detection_enabled,
      eyeball_detection_enabled,
      object_detection_enabled,
      head_direction_enabled,
      flag_notifications_enabled,
      video_recording_enabled,
      tab_switch_detection_enabled,
      microphone_detection_enabled,
      safe_browser_enabled,
      proctor_feed_to_test_taker_enabled,
      screen_sharing_enabled,
      screen_count_detection_enabled,
      control_desktop_apps_enabled,
      normal_proctoring,
      ai_powered_proctoring,
      recorded_manual_proctoring,
      face_authentication_enabled,
    } = exam;

    return res.status(200).json({
      third_eye_enabled,
      multiple_person_detection_enabled,
      eyeball_detection_enabled,
      object_detection_enabled,
      head_direction_enabled,
      flag_notifications_enabled,
      video_recording_enabled,
      tab_switch_detection_enabled,
      microphone_detection_enabled,
      safe_browser_enabled,
      proctor_feed_to_test_taker_enabled,
      screen_sharing_enabled,
      screen_count_detection_enabled,
      control_desktop_apps_enabled,
      normal_proctoring,
      ai_powered_proctoring,
      recorded_manual_proctoring,
      face_authentication_enabled,
    });
  } catch (err) {
    console.log("Error while getExamSettings : ", err);
    return res.status(500).json({
      success: false,
      message: "Error while getExamSettings",
    });
  }
};
