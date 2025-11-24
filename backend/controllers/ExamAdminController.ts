import { Request, Response } from "express";
import express from "express";
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";
import { User } from "../models/User";
import { Question } from "../models/Questions";
import { QuestionOption } from "../models/QuestionOption";
import { UserAnswer } from "../models/UserAnswer";
import { ViolationLog } from "../models/ViolationLog";
import { Scores } from "../models/Scores";
import { getUserIdFromToken } from "../utils/jwt";

export const createExam = async (req: Request, res: Response) => {
  try {
    console.log("📨 Received exam creation request");
    console.log("📋 Request body:", JSON.stringify(req.body, null, 2));

    const {
      exam_name,
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
      start_time,
      end_time,
      duration,
      questions,
    } = req.body;

    const user_id = getUserIdFromToken(req);
    if (!exam_name || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Some Parameter is Missing",
      });
    }
    const lastExam = await Exam.findOne({
      order: [["key", "DESC"]],
    });
    let nextKey = 100000;
    if (lastExam && lastExam.key) {
      nextKey = Number(lastExam.key) + 1;
      if (nextKey > 999999) nextKey = 100000;
    }

    const newExam = await Exam.create({
      user_id,
      exam_name,
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
      start_time,
      end_time,
      duration,
      key: nextKey,
    });

    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        // Find the correct answer text from options
        let correctAnswer = q.answer || "";
        if (q.options && Array.isArray(q.options)) {
          const correctOption = q.options.find(
            (opt: any) => typeof opt === "object" && opt.is_correct === true
          );
          if (correctOption) {
            correctAnswer =
              correctOption.option_text || correctOption.text || "";
          }
        }

        const createdQuestion = await Question.create({
          exam_id: newExam.id,
          question_text: q.question_text || q.question,
          answer: correctAnswer,
          marks: q.marks || 1,
        });

        if (q.options && Array.isArray(q.options)) {
          const optionsData = q.options.map((opt: any) => ({
            question_id: createdQuestion.id,
            option_text:
              typeof opt === "string" ? opt : opt.option_text || opt.text,
            is_correct: typeof opt === "object" ? !!opt.is_correct : false,
          }));

          await QuestionOption.bulkCreate(optionsData);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Exam Created Successfully",
      key: nextKey,
    });
  } catch (err: any) {
    console.error("Error creating exam:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error Creating exam",
      error: err.message,
      details: err.toString(),
    });
  }
};

export const getExam = async (req: Request, res: Response) => {
  const user_id = getUserIdFromToken(req);
  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }
  try {
    const exams = await Exam.findAll({
      where: { user_id },
      attributes: [
        "id",
        "exam_name",
        "key",
        "status",
        "start_time",
        "end_time",
        "duration",
      ],
      include: [
        {
          model: Attend,
          attributes: ["user_id", "exam_id"],
          include: [
            {
              model: User,
              attributes: ["name", "email"],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      success: true,
      message: "Exam names fetched successfully",
      exams,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching exams",
      error: err.message,
    });
  }
};

export const getCanditates = async (req: Request, res: Response) => {
  const { exam_id } = req.body;
  if (!exam_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID is required",
    });
  }
  try {
    const candidates = await Attend.findAll({
      where: { exam_id },
      attributes: ["user_id", "user_name"],
    });
    res.status(200).json({
      success: true,
      message: "Candidates fetched successfully",
      candidates,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching candidates",
      error: err.message,
    });
  }
};

export const getSingleExam = async (req: Request, res: Response) => {
  const { examId } = req.params;
  const user_id = getUserIdFromToken(req);
  console.log(examId);

  if (!examId || !user_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID and user authentication required",
    });
  }

  try {
    const exam = await Exam.findOne({
      where: {
        id: examId,
      },
      attributes: [
        "id",
        "exam_name",
        "key",
        "third_eye_enabled",
        "multiple_person_detection_enabled",
        "eyeball_detection_enabled",
        "object_detection_enabled",
        "head_direction_enabled",
        "flag_notifications_enabled",
        "video_recording_enabled",
        "tab_switch_detection_enabled",
        "microphone_detection_enabled",
        "safe_browser_enabled",
        "proctor_feed_to_test_taker_enabled",
        "screen_sharing_enabled",
        "screen_count_detection_enabled",
        "control_desktop_apps_enabled",
        "normal_proctoring",
        "ai_powered_proctoring",
        "recorded_manual_proctoring",
        "face_authentication_enabled",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Attend,
          attributes: ["user_id", "startTime", "endTime", "createdAt"],
          include: [
            {
              model: User,
              attributes: ["id", "name", "email", "dept", "dob", "reg"],
            },
          ],
        },
      ],
    });

    console.log(exam);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to view it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam details fetched successfully",
      exam,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching exam details",
      error: err.message,
    });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  const { examId } = req.params;
  const user_id = getUserIdFromToken(req);
  const {
    exam_name,
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
  } = req.body;

  if (!examId || !user_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID and user authentication required",
    });
  }

  try {
    const exam = await Exam.findOne({
      where: {
        id: examId,
        user_id: user_id,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to update it",
      });
    }

    const updateData: any = {};
    if (exam_name !== undefined) updateData.exam_name = exam_name;
    if (third_eye_enabled !== undefined)
      updateData.third_eye_enabled = third_eye_enabled;
    if (multiple_person_detection_enabled !== undefined)
      updateData.multiple_person_detection_enabled =
        multiple_person_detection_enabled;
    if (eyeball_detection_enabled !== undefined)
      updateData.eyeball_detection_enabled = eyeball_detection_enabled;
    if (object_detection_enabled !== undefined)
      updateData.object_detection_enabled = object_detection_enabled;
    if (head_direction_enabled !== undefined)
      updateData.head_direction_enabled = head_direction_enabled;
    if (flag_notifications_enabled !== undefined)
      updateData.flag_notifications_enabled = flag_notifications_enabled;
    if (video_recording_enabled !== undefined)
      updateData.video_recording_enabled = video_recording_enabled;
    if (tab_switch_detection_enabled !== undefined)
      updateData.tab_switch_detection_enabled = tab_switch_detection_enabled;
    if (microphone_detection_enabled !== undefined)
      updateData.microphone_detection_enabled = microphone_detection_enabled;
    if (safe_browser_enabled !== undefined)
      updateData.safe_browser_enabled = safe_browser_enabled;
    if (proctor_feed_to_test_taker_enabled !== undefined)
      updateData.proctor_feed_to_test_taker_enabled =
        proctor_feed_to_test_taker_enabled;
    if (screen_sharing_enabled !== undefined)
      updateData.screen_sharing_enabled = screen_sharing_enabled;
    if (screen_count_detection_enabled !== undefined)
      updateData.screen_count_detection_enabled =
        screen_count_detection_enabled;
    if (control_desktop_apps_enabled !== undefined)
      updateData.control_desktop_apps_enabled = control_desktop_apps_enabled;
    if (normal_proctoring !== undefined)
      updateData.normal_proctoring = normal_proctoring;
    if (ai_powered_proctoring !== undefined)
      updateData.ai_powered_proctoring = ai_powered_proctoring;
    if (recorded_manual_proctoring !== undefined)
      updateData.recorded_manual_proctoring = recorded_manual_proctoring;
    if (face_authentication_enabled !== undefined)
      updateData.face_authentication_enabled = face_authentication_enabled;

    await exam.update(updateData);

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      exam: await exam.reload(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error updating exam",
      error: err.message,
    });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  const { examId } = req.params;
  const user_id = getUserIdFromToken(req);

  if (!examId || !user_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID and user authentication required",
    });
  }

  try {
    const exam = await Exam.findOne({
      where: {
        id: examId,
        user_id: user_id,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to delete it",
      });
    }

    console.log(`🗑️ Deleting exam ${examId} and all related data...`);

    // Delete all related records in the correct order (foreign key dependencies)
    
    // 1. Delete violation logs for this exam
    await ViolationLog.destroy({
      where: { exam_id: examId }
    });
    console.log(`✅ Deleted violation logs for exam ${examId}`);

    // 2. Delete scores for this exam
    await Scores.destroy({
      where: { exam_id: examId }
    });
    console.log(`✅ Deleted scores for exam ${examId}`);

    // 3. Delete user answers for this exam
    await UserAnswer.destroy({
      where: { exam_id: examId }
    });
    console.log(`✅ Deleted user answers for exam ${examId}`);

    // 4. Delete question options for all questions in this exam
    const questions = await Question.findAll({
      where: { exam_id: examId }
    });
    
    const questionIds = questions.map(q => q.id);
    
    if (questionIds.length > 0) {
      await QuestionOption.destroy({
        where: { question_id: questionIds }
      });
      console.log(`✅ Deleted question options for exam ${examId}`);
    }

    // 5. Delete questions for this exam
    await Question.destroy({
      where: { exam_id: examId }
    });
    console.log(`✅ Deleted questions for exam ${examId}`);

    // 6. Delete attendance records for this exam
    await Attend.destroy({
      where: { exam_id: examId }
    });
    console.log(`✅ Deleted attendance records for exam ${examId}`);

    // 7. Finally, delete the exam itself
    await exam.destroy();
    console.log(`✅ Deleted exam ${examId}`);

    res.status(200).json({
      success: true,
      message: "Exam and all related data deleted successfully",
    });
  } catch (err: any) {
    console.error(`❌ Error deleting exam ${examId}:`, err);
    res.status(500).json({
      success: false,
      message: "Error deleting exam",
      error: err.message,
    });
  }
};

export const getExamResults = async (req: Request, res: Response) => {
  const { examId } = req.params;
  const user_id = getUserIdFromToken(req);

  if (!examId || !user_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID and user authentication required",
    });
  }

  try {
    const exam = await Exam.findOne({
      where: {
        id: examId,
        user_id: user_id,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to view it",
      });
    }

    const candidates = await Attend.findAll({
      where: { exam_id: examId },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "dept", "dob", "reg"],
        },
      ],
    });

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No candidates found for this exam",
        results: [],
      });
    }

    const totalQuestions = await Question.count({
      where: {
        exam_id: Number(examId),
      },
    });

    const maxScore = await Question.sum("marks", {
      where: {
        exam_id: Number(examId),
      },
    });

    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const userId = candidate.user_id;

        const userAnswers = await UserAnswer.findAll({
          where: {
            user_id: userId,
            exam_id: examId,
          },
          include: [
            {
              model: Question,
              attributes: ["marks"],
            },
            {
              model: QuestionOption,
              as: "selected_option",
              attributes: ["id", "option_text", "is_correct"],
            },
          ],
        });

        let correctAnswers = 0;
        let obtainedScore = 0;
        let totalAnswered = userAnswers.length;

        userAnswers.forEach((answer) => {
          if (answer.selected_option && answer.selected_option.is_correct) {
            correctAnswers++;
            obtainedScore += answer.question?.marks || 0;
          }
        });

        return {
          user_id: userId,
          name: candidate.user?.name || "Unknown",
          email: candidate.user?.email || "",
          total_answered: totalAnswered,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          obtained_score: obtainedScore,
          max_score: maxScore || 0,
          score_percentage:
            (maxScore || 0) > 0
              ? ((obtainedScore / (maxScore || 1)) * 100).toFixed(2)
              : "0.00",
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Exam results fetched successfully",
      exam_id: examId,
      exam_name: exam.exam_name,
      total_candidates: results.length,
      results: results,
    });
  } catch (err: any) {
    console.error("Error fetching exam results:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching exam results",
      error: err.message,
    });
  }
};

export const getStudentAnswers = async (req: Request, res: Response) => {
  const { examId, userId } = req.params;
  const examiner_id = getUserIdFromToken(req);

  if (!examId || !userId || !examiner_id) {
    return res.status(400).json({
      success: false,
      message: "Exam ID, User ID and authentication required",
    });
  }

  try {
    // Verify exam belongs to the examiner
    const exam = await Exam.findOne({
      where: {
        id: examId,
        user_id: examiner_id,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or you don't have permission to view it",
      });
    }

    // Get student's answers
    const answers = await UserAnswer.findAll({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
      include: [
        {
          model: QuestionOption,
          as: "selected_option",
          attributes: ["id", "option_text", "is_correct"],
        },
      ],
      order: [["question_id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Student answers retrieved successfully",
      data: {
        user_id: userId,
        exam_id: examId,
        totalAnswers: answers.length,
        answers,
      },
    });
  } catch (err: any) {
    console.error("Error retrieving student answers:", err);
    return res.status(500).json({
      success: false,
      message: "Error retrieving student answers",
      error: err.message,
    });
  }
};

export const updateExamStatus = async (req: Request, res: Response) => {
  try {
    const { examId, status } = req.body;
    const user_id = getUserIdFromToken(req);

    if (!examId || !status) {
      return res.status(400).json({
        success: false,
        message: "Exam ID and status are required",
      });
    }

    const exam = await Exam.findOne({
      where: { id: examId, user_id },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.status = status;
    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam status updated successfully",
      exam,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error updating exam status",
      error: err.message,
    });
  }
};
