/**
 * MCQ Question Types
 * These types define the structure of MCQ questions used throughout the application
 */

// Internal representation for editing
export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  marks?: number; // Optional marks field for each question
}

// Final format for API submission
export interface MCQQuestionSubmit {
  question: string;
  options: string[]; // Array of option texts
  answer: number; // Index of correct answer (0-based)
}

/**
 * Extended Exam interface with MCQ questions
 */
export interface ExamWithQuestions {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "draft" | "completed";
  studentsCount: number;
  startTime?: string;
  endTime?: string;
  mcqQuestions?: MCQQuestion[];
}
