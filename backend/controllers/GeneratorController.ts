import { Request, Response } from "express";
import axios from "axios";

const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "gemini-1.5-flash";

interface QuestionOption {
  option_text: string;
  is_correct: boolean;
  position: number;
}

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  answer?: string;
  marks: number;
  options?: QuestionOption[];
  position: number;
}

interface LLMResponse {
  questions: GeneratedQuestion[];
}


export const generateQuestionsFromText = async (req: Request, res: Response) => {
  try {
    const { text, exam_id, question_count = 10, question_types = ["mcq"] } = req.body;

    // Validate input
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        success: false,
        message: "Text content is required",
      });
    }

    if (!exam_id) {
      return res.status(400).json({
        success: false,
        message: "exam_id is required",
      });
    }

    console.log(`Generating ${question_count} questions from text (${text.length} characters)`);

    const generatedQuestions = await callLLMForQuestions(
      text,
      question_count,
      question_types
    );

    return res.status(200).json({
      success: true,
      message: `Generated ${generatedQuestions.length} questions`,
      data: {
        exam_id,
        questions: generatedQuestions,
        total: generatedQuestions.length,
      },
    });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

async function callLLMForQuestions(
  text: string,
  questionCount: number,
  questionTypes: string[]
): Promise<GeneratedQuestion[]> {
  const systemPrompt = `You are an expert exam question generator. Your task is to analyze the provided text and generate high-quality exam questions.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Generate ${questionCount} questions of types: ${questionTypes.join(", ")}.

For each question, follow this exact JSON structure:
{
  "questions": [
    {
      "question_text": "The question text here?",
      "question_type": "mcq",
      "answer": "correct answer for non-MCQ, or null for MCQ",
      "marks": 1,
      "options": [
        {
          "option_text": "Option A text",
          "is_correct": true,
          "position": 0
        },
        {
          "option_text": "Option B text",
          "is_correct": false,
          "position": 1
        }
      ],
      "position": 0
    }
  ]
}

Rules:
- For MCQ: provide 4 options, mark exactly one as correct, set answer to null
- For short/long/essay: provide answer text, set options to empty array or null
- Ensure questions are clear, unambiguous, and directly related to the text
- Number questions using position field (0-indexed)
- Each question should test important concepts from the text`;

  const userPrompt = `Generate ${questionCount} exam questions from this text:\n\n${text.slice(0, 8000)}`; // Limit text to avoid token limits

  try {
    let llmResponse: string;

    llmResponse = await callGemini(systemPrompt, userPrompt);

    const parsed = parseAndValidateLLMResponse(llmResponse);
    return parsed.questions;
  } catch (error: any) {
    console.error(" LLM API error:", error);
    throw new Error(`LLM generation failed: ${error.message}`);
  }
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = LLM_MODEL || "gemini-1.5-flash";
  
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${LLM_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.candidates[0].content.parts[0].text;
}

function parseAndValidateLLMResponse(responseText: string): LLMResponse {
  try {
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*$/g, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\s*/g, "");
    }

    const parsed: LLMResponse = JSON.parse(cleanedText);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response structure: missing questions array");
    }

    parsed.questions.forEach((q, idx) => {
      if (!q.question_text || typeof q.question_text !== "string") {
        throw new Error(`Question ${idx}: missing or invalid question_text`);
      }
      if (!q.question_type) {
        q.question_type = "mcq";
      }
      if (typeof q.marks !== "number") {
        q.marks = 1;
      }
      if (typeof q.position !== "number") {
        q.position = idx;
      }

      if (q.question_type === "mcq") {
        if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
          throw new Error(`Question ${idx}: MCQ must have options`);
        }
        const correctCount = q.options.filter((opt) => opt.is_correct).length;
        if (correctCount !== 1) {
          throw new Error(`Question ${idx}: MCQ must have exactly one correct option`);
        }
      }
    });

    return parsed;
  } catch (error: any) {
    console.error("Failed to parse LLM response:", error);
    console.error("Response text:", responseText);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}

export const testLLMConnection = async (req: Request, res: Response) => {
  try {
    if (!LLM_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "LLM_API_KEY not configured in environment variables",
      });
    }

    const testPrompt = "Generate a simple JSON object with one MCQ question about programming.";
    
    const response = await callGemini(
      "You are a helpful assistant. Return only valid JSON.",
      testPrompt
    );

    return res.status(200).json({
      success: true,
      message: "Gemini API connection successful",
      model: LLM_MODEL,
      response: response,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Gemini API connection failed",
      error: error.message,
    });
  }
};
