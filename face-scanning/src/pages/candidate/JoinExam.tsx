import React, { useState } from 'react';
import styles from '../../styles/CreateExamPage.module.css';
import axios from 'axios';
import { getTokenFromCookie } from '@/constants/AuthStore';
import { useRouter } from 'next/router';

const JoinExam = () => {
  const [examKey, setExamKey] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  const handleJoinExam = async () => {
    if (!examKey.trim()) {
      setError('Please enter an exam key');
      return;
    }

    setIsJoining(true);
    setError(null);
    setSuccess(null);

    try {
      const base = process.env.NEXT_BACKEND_URL;
      const payload = {
        exam_key: examKey.trim()
      };

      const res = await axios.post(`${base}/joinExam`, payload);

      if (res.data.success) {
        setSuccess('Successfully joined the exam.');
        setExamKey('');
        router.push('/photo');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to join exam');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining) {
      handleJoinExam();
    }
  };

  return (
    <div className={`${styles.examinerContainer} ${styles.enterpriseRoot}`} style={{ background: 'var(--background)' }}>
      <div className={styles.pageBackdrop} style={{ opacity: 0 }} />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title} style={{ color: 'var(--text-primary)' }}>
            Join Exam
          </h1>
          <p className={styles.subtitle} style={{ color: 'var(--text-secondary)' }}>
            Enter your exam key to join the assessment
          </p>
        </div>
      </header>

      <section className={styles.examsSection}>
        <div className={`${styles.glassPanel} theme-transition`} style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '20px',
              fontWeight: 600,
              transition: 'color 0.3s ease'
            }}>
              Ready to start?
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginTop: '6px',
              fontSize: '14px',
              transition: 'color 0.3s ease'
            }}>
              Enter the exam key provided by your examiner
            </p>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="examKey"
              className="theme-transition"
              style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                transition: 'color 0.3s ease'
              }}
            >
              Exam Key
            </label>
            <input
              id="examKey"
              type="text"
              value={examKey}
              onChange={(e) => setExamKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter 6-digit exam key"
              disabled={isJoining}
              className="input-theme"
              style={{
                width: '100%',
                padding: '14px 14px',
                fontSize: '15px',
                borderRadius: 10,
                outline: 'none'
              }}
              maxLength={6}
            />
          </div>

          {error && (
            <div className="error-theme theme-transition" style={{
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: 10,
              fontSize: '13px',
              border: '1px solid var(--error-color)'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-theme theme-transition" style={{
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: 10,
              fontSize: '13px',
              border: '1px solid var(--success-color)'
            }}>
              {success}
            </div>
          )}

          <button
            onClick={handleJoinExam}
            disabled={isJoining || !examKey.trim()}
            className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '15px',
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex',
              fontWeight: 600,
              borderRadius: 10,
              opacity: (isJoining || !examKey.trim()) ? 0.6 : 1,
              cursor: (isJoining || !examKey.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {isJoining ? 'Joining…' : 'Join Exam'}
          </button>

          <div className="card-theme theme-transition" style={{
            marginTop: '18px',
            padding: '14px',
            borderRadius: 10
          }}>
            <h4 style={{
              color: 'var(--text-primary)',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'color 0.3s ease'
            }}>
              Instructions
            </h4>
            <ul style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: 1.6,
              paddingLeft: '18px',
              margin: 0,
              transition: 'color 0.3s ease'
            }}>
              <li>Enter the 6-digit exam key provided by your examiner</li>
              <li>Ensure a stable internet connection</li>
              <li>Verify camera and microphone access</li>
              <li>Close unnecessary applications before starting</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JoinExam;