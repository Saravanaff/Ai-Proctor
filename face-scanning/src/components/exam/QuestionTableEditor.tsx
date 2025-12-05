import React, { useState, useEffect } from 'react';
import { MCQQuestion } from '../../types/mcq';
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react';

interface QuestionTableEditorProps {
  questions: MCQQuestion[];
  onUpdate: (questions: MCQQuestion[]) => void;
  onDelete: (id: string) => void;
}

interface EditingCell {
  questionId: string;
  field: 'question' | 'option1' | 'option2' | 'option3' | 'option4' | 'correctAnswer';
}

const QuestionTableEditor: React.FC<QuestionTableEditorProps> = ({
  questions,
  onUpdate,
  onDelete,
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localQuestions, setLocalQuestions] = useState<MCQQuestion[]>(questions);

  useEffect(() => {
    console.log('QuestionTableEditor received questions:', JSON.stringify(questions, null, 2));
    setLocalQuestions(questions);
  }, [questions]);

  const getCorrectAnswerLetter = (question: MCQQuestion): string => {
    const correctIndex = question.options.findIndex(
      (opt) => opt.id === question.correctOptionId
    );
    return ['A', 'B', 'C', 'D'][correctIndex] || 'A';
  };

  const handleCellClick = (questionId: string, field: EditingCell['field']) => {
    const question = localQuestions.find((q) => q.id === questionId);
    if (!question) return;

    let value = '';
    if (field === 'question') {
      value = question.question;
    } else if (field === 'correctAnswer') {
      value = getCorrectAnswerLetter(question);
    } else {
      const optionIndex = parseInt(field.replace('option', '')) - 1;
      value = question.options[optionIndex]?.text || '';
    }

    setEditingCell({ questionId, field });
    setEditValue(value);
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    const updatedQuestions = localQuestions.map((q) => {
      if (q.id !== editingCell.questionId) return q;

      const question = { ...q };
      
      if (editingCell.field === 'question') {
        question.question = editValue;
      } else if (editingCell.field === 'correctAnswer') {
        const answerIndex = ['A', 'B', 'C', 'D'].indexOf(editValue.toUpperCase());
        if (answerIndex >= 0 && answerIndex < question.options.length) {
          question.correctOptionId = question.options[answerIndex].id;
        }
      } else {
        const optionIndex = parseInt(editingCell.field.replace('option', '')) - 1;
        if (question.options[optionIndex]) {
          question.options[optionIndex] = {
            ...question.options[optionIndex],
            text: editValue,
          };
        }
      }

      return question;
    });

    setLocalQuestions(updatedQuestions);
    onUpdate(updatedQuestions);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleAddRow = () => {
    const newQuestion: MCQQuestion = {
      id: `q-${Date.now()}`,
      question: 'New Question',
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Option 1' },
        { id: `opt-${Date.now()}-2`, text: 'Option 2' },
        { id: `opt-${Date.now()}-3`, text: 'Option 3' },
        { id: `opt-${Date.now()}-4`, text: 'Option 4' },
      ],
      correctOptionId: `opt-${Date.now()}-1`,
    };

    const updatedQuestions = [...localQuestions, newQuestion];
    setLocalQuestions(updatedQuestions);
    onUpdate(updatedQuestions);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '700px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: 'var(--card-bg)',
      }}
    >
      <table
        style={{
          width: 'max-content',  // ✅ Changed from 100% to max-content
          minWidth: '100%',       // ✅ Ensure minimum width is 100%
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: '15px',
        }}
      >
        <thead
          style={{
            position: 'sticky',
            top: 0,
            background: 'var(--secondary-bg)',
            zIndex: 10,
          }}
        >
          <tr>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '50px',
                background: 'var(--secondary-bg)',
              }}
            >
              #
            </th>
            <th
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '300px',  // ✅ Reduced from 500px to 300px
                maxWidth: '500px',  // ✅ Added max width
                background: 'var(--secondary-bg)',
              }}
            >
              Question
            </th>
            <th
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '150px',  // ✅ Reduced from 220px to 150px
                maxWidth: '220px',  // ✅ Added max width
                background: 'var(--secondary-bg)',
              }}
            >
              Option A
            </th>
            <th
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '150px',  // ✅ Reduced from 220px to 150px
                maxWidth: '220px',  // ✅ Added max width
                background: 'var(--secondary-bg)',
              }}
            >
              Option B
            </th>
            <th
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '150px',  // ✅ Reduced from 220px to 150px
                maxWidth: '220px',  // ✅ Added max width
                background: 'var(--secondary-bg)',
              }}
            >
              Option C
            </th>
            <th
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '150px',  // ✅ Reduced from 220px to 150px
                maxWidth: '220px',  // ✅ Added max width
                background: 'var(--secondary-bg)',
              }}
            >
              Option D
            </th>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                minWidth: '100px',
                background: 'var(--secondary-bg)',
              }}
            >
              Answer
            </th>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--border-color)',
                minWidth: '80px',
                background: 'var(--secondary-bg)',
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {localQuestions.map((question, index) => (
            <tr
              key={question.id}
              style={{
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(var(--accent-color-rgb), 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <td
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  background: 'var(--secondary-bg)',
                }}
              >
                {index + 1}
              </td>
              
              {/* Question Cell */}
              <td
                onClick={() => handleCellClick(question.id, 'question')}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  position: 'relative',
                  minWidth: '300px',   // ✅ Match header
                  maxWidth: '500px',   // ✅ Match header
                  wordWrap: 'break-word',  // ✅ Allow text to wrap
                  whiteSpace: 'normal',    // ✅ Allow multiline text
                }}
              >
                {editingCell?.questionId === question.id &&
                editingCell?.field === 'question' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '2px solid var(--accent-color)',
                        borderRadius: '6px',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        padding: '4px 8px',
                        background: 'var(--accent-color)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Check size={14} color="white" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '4px 8px',
                        background: 'var(--text-tertiary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} color="white" />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{question.question}</span>
                    <Edit2
                      size={12}
                      color="var(--text-tertiary)"
                      style={{ opacity: 0.5 }}
                    />
                  </div>
                )}
              </td>

              {/* Option Cells */}
              {[1, 2, 3, 4].map((optNum) => {
                const field = `option${optNum}` as EditingCell['field'];
                const option = question.options[optNum - 1];
                const isCorrect = question.correctOptionId === option?.id;
                
                // Debug logging
                if (index === 0) { // Only log for first question to avoid spam
                  console.log(`Option ${optNum}:`, {
                    option,
                    optionText: option?.text,
                    optionId: option?.id,
                    isCorrect,
                    fullOptions: question.options
                  });
                }

                return (
                  <td
                    key={optNum}
                    onClick={() => handleCellClick(question.id, field)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      background: isCorrect
                        ? 'rgba(var(--accent-color-rgb), 0.08)'
                        : 'transparent',
                      fontWeight: isCorrect ? 600 : 400,
                      minWidth: '150px',       // ✅ Match header
                      maxWidth: '220px',       // ✅ Match header
                      wordWrap: 'break-word',  // ✅ Allow text to wrap
                      whiteSpace: 'normal',    // ✅ Allow multiline text
                    }}
                  >
                    {editingCell?.questionId === question.id &&
                    editingCell?.field === field ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            border: '2px solid var(--accent-color)',
                            borderRadius: '6px',
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--accent-color)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Check size={14} color="white" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--text-tertiary)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={14} color="white" />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{option?.text ?? ''}</span>
                        {isCorrect && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              background: 'var(--accent-color)',
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Correct Answer Cell */}
              <td
                onClick={() => handleCellClick(question.id, 'correctAnswer')}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                {editingCell?.questionId === question.id &&
                editingCell?.field === 'correctAnswer' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      style={{
                        padding: '6px 12px',
                        border: '2px solid var(--accent-color)',
                        borderRadius: '6px',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {['A', 'B', 'C', 'D'].slice(0, question.options.length).map((letter) => (
                        <option key={letter} value={letter}>
                          {letter}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        padding: '4px 8px',
                        background: 'var(--accent-color)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Check size={14} color="white" />
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: 'var(--accent-color)',
                      color: 'white',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    {getCorrectAnswerLetter(question)}
                  </span>
                )}
              </td>

              {/* Actions Cell */}
              <td
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <button
                  onClick={() => onDelete(question.id)}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee';
                    e.currentTarget.style.borderColor = '#f44';
                    e.currentTarget.style.color = '#f44';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Row Button */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--secondary-bg)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={handleAddRow}
          style={{
            padding: '10px 20px',
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--accent-color-rgb), 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={16} /> Add New Question
        </button>
      </div>
    </div>
  );
};

export default QuestionTableEditor;
