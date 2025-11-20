import { Request, Response } from "express";
import { sequelize } from "../db";
import Question from "../models/Questions";
import QuestionOption from "../models/QuestionOption";

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const {
      exam_id,
      question_text,
      answer,
      marks = 1,
      question_type = "mcq",
      options,
      position,
    } = req.body;

    if (!exam_id || !question_text) {
      return res.status(400).json({
        success: false,
        message: "exam_id and question_text are required",
      });
    }

    const transaction = await sequelize.transaction();
    try {
      // Find the correct answer text from options if provided
      let correctAnswer = answer || '';
      if (options && options.length) {
        const correctOption = options.find((opt: any) => opt.is_correct === true);
        if (correctOption) {
          correctAnswer = correctOption.option_text || correctOption.text || String(correctOption);
        }
      }

      const question = await Question.create(
        {
          exam_id,
          question_text,
          answer: correctAnswer,
          marks,
        },
        { transaction }
      );

      if (options && options.length) {
        const toCreate = options.map((opt: any, idx: number) => ({
          question_id: question.id,
          option_text: opt.option_text ?? opt.text ?? String(opt),
          is_correct: !!opt.is_correct,
        }));

        await QuestionOption.bulkCreate(toCreate, { transaction });
      }

      await transaction.commit();

      const saved = await Question.findByPk(question.id, {
        include: [QuestionOption],
      });
      return res.status(201).json({ success: true, question: saved });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Internal error" });
  }
};

export const updateQuestionsForExam = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.params;
    const { questions } = req.body;

    if (!exam_id) {
      return res
        .status(400)
        .json({ success: false, message: "exam_id is required" });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "questions array is required and must not be empty",
      });
    }

    const transaction = await sequelize.transaction();
    try {
      // Delete existing questions and their options for this exam
      const existingQuestions = await Question.findAll({
        where: { exam_id },
        attributes: ["id"],
        transaction,
      });

      const questionIds = existingQuestions.map((q) => q.id);

      if (questionIds.length > 0) {
        // Delete all options for these questions
        await QuestionOption.destroy({
          where: { question_id: questionIds },
          transaction,
        });

        // Delete all questions
        await Question.destroy({
          where: { exam_id },
          transaction,
        });
      }

      // Create new questions
      const createdQuestions = [];
      for (const questionData of questions) {
        const {
          question_text,
          answer,
          marks = 1,
          question_type = "mcq",
          options,
        } = questionData;

        if (!question_text) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Each question must have question_text",
          });
        }

        // Find the correct answer text from options if provided
        let correctAnswer = answer || '';
        if (options && options.length) {
          const correctOption = options.find((opt: any) => opt.is_correct === true);
          if (correctOption) {
            correctAnswer = correctOption.option_text || correctOption.text || String(correctOption);
          }
        }

        const question = await Question.create(
          {
            exam_id,
            question_text,
            answer: correctAnswer,
            marks,
          },
          { transaction }
        );

        if (options && options.length) {
          const toCreate = options.map((opt: any) => ({
            question_id: question.id,
            option_text: opt.option_text ?? opt.text ?? String(opt),
            is_correct: !!opt.is_correct,
          }));

          await QuestionOption.bulkCreate(toCreate, { transaction });
        }

        createdQuestions.push(question.id);
      }

      await transaction.commit();

      // Fetch all newly created questions with their options
      const savedQuestions = await Question.findAll({
        where: { exam_id },
        include: [QuestionOption],
      });

      return res.status(200).json({
        success: true,
        message: `Successfully updated ${savedQuestions.length} questions for exam ${exam_id}`,
        questions: savedQuestions,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Internal error" });
  }
};

export const getQuestionsByExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!examId)
      return res
        .status(400)
        .json({ success: false, message: "exam_id is required" });

    const questions = await Question.findAll({
      where: { exam_id: examId },
      attributes: [
        "id",
        "exam_id",
        "question_text",
        "marks",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: QuestionOption,
          attributes: ["id", "question_id", "option_text", "is_correct"],
        },
      ],
    });

    return res.status(200).json({ success: true, questions });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Internal error" });
  }
};

export const getOptionsWithAnswer = async (req: Request, res: Response) => {
  try {
    const { question_id } = req.params;
    if (!question_id)
      return res
        .status(400)
        .json({ success: false, message: "question_id is required" });

    const options = await QuestionOption.findAll({
      where: { question_id },
      attributes: ["id", "question_id", "option_text"],
    });

    return res.status(200).json({ success: true, options });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Internal error" });
  }
};

export const getQuestionsWithAnswers = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.params;
    if (!exam_id)
      return res
        .status(400)
        .json({ success: false, message: "exam_id is required" });

    const questions = await Question.findAll({
      where: { exam_id },
      attributes: [
        "id",
        "exam_id",
        "question_text",
        "answer",
        "marks",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: QuestionOption,
          attributes: ["id", "question_id", "option_text", "is_correct"],
        },
      ],
    });

    return res.status(200).json({ success: true, questions });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Internal error" });
  }
};

export default { createQuestion, updateQuestionsForExam, getQuestionsByExam };
