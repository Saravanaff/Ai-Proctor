import { Attend } from "../models/Attend";
import { Exam } from "../models/Exam";
import { UserAnswer } from "../models/UserAnswer";
import { User } from "../models/User";
import { Question } from "../models/Questions";
import { QuestionOption } from "../models/QuestionOption";
import { Request, Response } from "express";
import { getUserIdFromToken } from "../utils/jwt";

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

export const saveUserAnswers = async (req: Request, res: Response) => {
  try {
    const { exam_id, answers } = req.body;
    const user_id = getUserIdFromToken(req);

    console.log("📝 Saving user answers:", {
      user_id,
      exam_id,
      answersCount: answers?.length,
    });

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!exam_id) {
      return res.status(400).json({
        success: false,
        message: "exam_id is required",
      });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "answers array is required and must not be empty",
      });
    }

    const exam = await Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    await UserAnswer.destroy({
      where: {
        user_id: Number(user_id),
        exam_id: Number(exam_id),
      },
    });

    console.log("Cleared previous answers for user");

    const answersData = answers.map((answer: any) => ({
      user_id: Number(user_id),
      exam_id: Number(exam_id),
      question_id: Number(answer.question_id),
      option_id: answer.option_id ? Number(answer.option_id) : null,
      written_answer: answer.option_text || null,
      answered_at: new Date(),
    }));

    const savedAnswers = await UserAnswer.bulkCreate(answersData);

    console.log("Successfully saved answers:", {
      user_id,
      exam_id,
      totalAnswers: savedAnswers.length,
    });

    return res.status(201).json({
      success: true,
      message: "Answers saved successfully",
      data: {
        user_id,
        exam_id,
        totalAnswers: savedAnswers.length,
        savedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error("Error saving user answers:", err);
    return res.status(500).json({
      success: false,
      message: "Error saving user answers",
      error: err.message,
    });
  }
};

export const getUserAnswersByAdmin = async (req: Request, res: Response) => {
  try {
    const { examId, candidateUserId } = req.params;
    const adminUserId = getUserIdFromToken(req);

    console.log("📊 Fetching user answers for admin:", {
      adminUserId,
      examId,
      candidateUserId,
    });

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    if (!examId || !candidateUserId) {
      return res.status(400).json({
        success: false,
        message: "examId and candidateUserId are required",
      });
    }

    const exam = await Exam.findOne({
      where: {
        id: Number(examId),
        user_id: adminUserId,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to view it",
      });
    }

    const attendance = await Attend.findOne({
      where: {
        exam_id: Number(examId),
        user_id: Number(candidateUserId),
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Candidate did not attend this exam",
      });
    }

    const userAnswers = await UserAnswer.findAll({
      where: {
        user_id: Number(candidateUserId),
        exam_id: Number(examId),
      },
      include: [
        {
          model: Question,
          attributes: ["id", "question_text"],
          include: [
            {
              model: QuestionOption,
              as: "options",
              attributes: ["id", "option_text", "is_correct"],
            },
          ],
        },
        {
          model: QuestionOption,
          as: "selected_option",
          attributes: ["id", "option_text", "is_correct"],
        },
      ],
      order: [["question_id", "ASC"]],
    });

    let correctAnswers = 0;
    let totalAnswered = userAnswers.length;

    const answersWithDetails = userAnswers.map((answer) => {
      const isCorrect = answer.selected_option?.is_correct || false;
      if (isCorrect) correctAnswers++;

      return {
        question_id: answer.question_id,
        question_text: answer.question?.question_text,
        all_options: answer.question?.options || [],
        selected_option_id: answer.option_id,
        selected_option_text: answer.selected_option?.option_text,
        is_correct: isCorrect,
        written_answer: answer.written_answer,
        answered_at: answer.answered_at,
      };
    });

    console.log("Successfully fetched user answers:", {
      totalAnswered,
      correctAnswers,
    });

    return res.status(200).json({
      success: true,
      message: "User answers fetched successfully",
      data: {
        exam: {
          id: exam.id,
          name: exam.exam_name,
        },
        candidate: {
          user_id: attendance.user_id,
          name: attendance.user?.name,
          email: attendance.user?.email,
        },
        statistics: {
          total_answered: totalAnswered,
          correct_answers: correctAnswers,
          incorrect_answers: totalAnswered - correctAnswers,
          score_percentage:
            totalAnswered > 0
              ? ((correctAnswers / totalAnswered) * 100).toFixed(2)
              : "0.00",
        },
        answers: answersWithDetails,
      },
    });
  } catch (err: any) {
    console.error("Error fetching user answers:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching user answers",
      error: err.message,
    });
  }
};






