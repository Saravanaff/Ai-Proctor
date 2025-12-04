import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  getExamId, 
  getUserId, 
  hasValidExamId, 
  hasValidUserId,
  getExamStartTime,
  clearExamData
} from '@/constants/AuthStore';
import { getExamSettings } from '@/constants/examSettingsConsts';

interface ExamStateError {
  type: 'NO_EXAM_ID' | 'NO_USER_ID' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'EXAM_NOT_FOUND';
  message: string;
  recoverable: boolean;
}

interface ExamState {
  examId: string | null;
  userId: string | null;
  examSettings: any;
  examStartTime: string | null;
  isLoading: boolean;
  error: ExamStateError | null;
  isValid: boolean;
}

export const useExamState = () => {
  const router = useRouter();
  const isMounted = useRef(true);
  const [state, setState] = useState<ExamState>({
    examId: null,
    userId: null,
    examSettings: null,
    examStartTime: null,
    isLoading: true,
    error: null,
    isValid: false,
  });

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Validate and restore exam state
  const validateExamState = useCallback(() => {
    if (!isMounted.current) return false;
    
    console.log('🔍 Validating exam state...');

    const examId = getExamId();
    const userId = getUserId();
    const examSettings = getExamSettings();
    const examStartTime = getExamStartTime();

    console.log('Exam ID:', examId);
    console.log('User ID:', userId);
    console.log('Has valid exam ID:', hasValidExamId());
    console.log('Has valid user ID:', hasValidUserId());

    // ✅ Check if exam ID is missing
    if (!hasValidExamId()) {
      if (isMounted.current) {
        setState({
          examId: null,
          userId: userId,
          examSettings: null,
          examStartTime: null,
          isLoading: false,
          error: {
            type: 'NO_EXAM_ID',
            message: 'No exam session found. Please start the exam from the beginning.',
            recoverable: false,
          },
          isValid: false,
        });
      }
      return false;
    }

    // ✅ Check if user ID is missing
    if (!hasValidUserId()) {
      if (isMounted.current) {
        setState({
          examId: examId,
          userId: null,
          examSettings: examSettings,
          examStartTime: examStartTime,
          isLoading: false,
          error: {
            type: 'NO_USER_ID',
            message: 'User session expired. Please login again.',
            recoverable: false,
          },
          isValid: false,
        });
      }
      return false;
    }

    // ✅ All valid - update state
    if (isMounted.current) {
      setState({
        examId: examId,
        userId: userId,
        examSettings: examSettings,
        examStartTime: examStartTime,
        isLoading: false,
        error: null,
        isValid: true,
      });
    }

    console.log('✅ Exam state is valid');
    return true;
  }, []);

  // ✅ Initialize on mount
  useEffect(() => {
    validateExamState();
  }, [validateExamState]);

  // ✅ Handle navigation when error occurs
  useEffect(() => {
    if (!isMounted.current) return;
    
    if (state.error && !state.error.recoverable) {
      console.error('❌ Unrecoverable exam state error:', state.error);
      
      // Wait a bit before redirecting to show error message
      const timer = setTimeout(() => {
        if (!isMounted.current) return;
        
        if (state.error?.type === 'NO_USER_ID' || state.error?.type === 'UNAUTHORIZED') {
          // Clear all data and redirect to login
          clearExamData();
          router.push('/auth/login');
        } else if (state.error?.type === 'NO_EXAM_ID') {
          // Redirect to student dashboard or exam join page
          router.push('/student');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [state.error, router]);

  // ✅ Retry validation (useful for network errors)
  const retry = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setTimeout(() => {
      if (isMounted.current) {
        validateExamState();
      }
    }, 500);
  }, [validateExamState]);

  return {
    ...state,
    retry,
    validateExamState,
  };
};
