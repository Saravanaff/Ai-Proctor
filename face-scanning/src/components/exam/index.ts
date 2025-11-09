/**
 * Central export point for MCQ-related components and types
 * Import from this file to use MCQ functionality throughout the app
 */

// Components
export { default as MCQQuestionEditor } from "./MCQQuestionEditor";
export { default as MCQQuestionList } from "./MCQQuestionList";
export { default as LatexRenderer } from "./LatexRenderer";

// Re-export types for convenience
export type {
  MCQOption,
  MCQQuestion,
  MCQQuestionSubmit,
} from "../../types/mcq";
