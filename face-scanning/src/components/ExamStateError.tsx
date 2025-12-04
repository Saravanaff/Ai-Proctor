import React from 'react';
import { useRouter } from 'next/router';

interface ExamStateErrorProps {
  type: 'NO_EXAM_ID' | 'NO_USER_ID' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'EXAM_NOT_FOUND';
  message: string;
  recoverable: boolean;
  onRetry?: () => void;
}

const ExamStateError: React.FC<ExamStateErrorProps> = ({ type, message, recoverable, onRetry }) => {
  const router = useRouter();

  const getIcon = () => {
    switch (type) {
      case 'NO_EXAM_ID':
      case 'EXAM_NOT_FOUND':
        return '📝';
      case 'NO_USER_ID':
      case 'UNAUTHORIZED':
        return '🔒';
      case 'NETWORK_ERROR':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'NO_EXAM_ID':
        return 'Exam Session Not Found';
      case 'NO_USER_ID':
        return 'Authentication Required';
      case 'UNAUTHORIZED':
        return 'Unauthorized Access';
      case 'EXAM_NOT_FOUND':
        return 'Exam Not Found';
      case 'NETWORK_ERROR':
        return 'Connection Error';
      default:
        return 'An Error Occurred';
    }
  };

  const handleAction = () => {
    if (recoverable && onRetry) {
      onRetry();
    } else if (type === 'NO_USER_ID' || type === 'UNAUTHORIZED') {
      router.push('/auth/login');
    } else if (type === 'NO_EXAM_ID') {
      router.push('/student');
    }
  };

  return (
    <div
      className="theme-transition"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: '20px',
      }}
    >
      <div
        className="theme-transition"
        style={{
          background: 'var(--card-bg)',
          borderRadius: '20px',
          padding: '48px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px var(--shadow)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '72px',
            marginBottom: '24px',
            animation: 'bounce 2s ease-in-out infinite',
          }}
        >
          {getIcon()}
        </div>

        {/* Title */}
        <h1
          className="theme-transition"
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '16px',
            transition: 'color 0.3s ease',
          }}
        >
          {getTitle()}
        </h1>

        {/* Message */}
        <p
          className="theme-transition"
          style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '32px',
            transition: 'color 0.3s ease',
          }}
        >
          {message}
        </p>

        {/* Action Button */}
        <button
          onClick={handleAction}
          style={{
            background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(14, 165, 233, 0.4)';
          }}
        >
          {recoverable && onRetry ? '🔄 Retry' : type === 'NO_USER_ID' || type === 'UNAUTHORIZED' ? '🔐 Login' : '🏠 Go to Dashboard'}
        </button>

        {/* Additional Info */}
        {!recoverable && (
          <p
            className="theme-transition"
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '24px',
              opacity: 0.7,
              transition: 'color 0.3s ease',
            }}
          >
            Redirecting automatically in a few seconds...
          </p>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default ExamStateError;
