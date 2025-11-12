import { Request, Response } from "express";
import { Exam } from "../models/Exam";
import { Attend } from "../models/Attend";
import { User } from "../models/User";
import { UserAnswer } from "../models/UserAnswer";
import { QuestionOption } from "../models/QuestionOption";
import { getUserIdFromToken } from "../utils/jwt";

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
          attributes: ["id", "name", "email"],
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
              model: QuestionOption,
              as: "selected_option",
              attributes: ["id", "option_text", "is_correct"],
            },
          ],
        });

        let correctAnswers = 0;
        let totalAnswered = userAnswers.length;

        userAnswers.forEach((answer) => {
          if (answer.selected_option && answer.selected_option.is_correct) {
            correctAnswers++;
          }
        });

        return {
          user_id: userId,
          name: candidate.user?.name || "Unknown",
          email: candidate.user?.email || "",
          total_answered: totalAnswered,
          correct_answers: correctAnswers,
          score_percentage:
            totalAnswered > 0
              ? ((correctAnswers / totalAnswered) * 100).toFixed(2)
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

export const getScoreInPercent = async (req: Request, res: Response) => {
  try {
    const { userId, examId } = req.params;

    if (!userId || !examId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Exam ID are required",
      });
    }

    const userAnswers = await UserAnswer.findAll({
      where: {
        user_id: Number(userId),
        exam_id: Number(examId),
      },
      include: [
        {
          model: QuestionOption,
          as: "selected_option",
          attributes: ["is_correct"],
        },
      ],
    });

    if (!userAnswers || userAnswers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No answers found for this user and exam",
      });
    }

    let correctAnswers = 0;
    const totalAnswered = userAnswers.length;

    userAnswers.forEach((answer) => {
      if (answer.selected_option && answer.selected_option.is_correct) {
        correctAnswers++;
      }
    });

    const scorePercentage =
      totalAnswered > 0
        ? ((correctAnswers / totalAnswered) * 100).toFixed(2)
        : "0.00";

    res.status(200).json({
      success: true,
      message: "Score calculated successfully",
      data: {
        user_id: Number(userId),
        exam_id: Number(examId),
        total_questions: totalAnswered,
        correct_answers: correctAnswers,
        incorrect_answers: totalAnswered - correctAnswers,
        score_percentage: scorePercentage,
      },
    });
  } catch (err: any) {
    console.error("Error calculating score:", err);
    res.status(500).json({
      success: false,
      message: "Error calculating score",
      error: err.message,
    });
  }
};
