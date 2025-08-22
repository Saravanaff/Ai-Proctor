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
  const router=useRouter();

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
      const base = 'https://localhost:3002';
      const payload = {
        exam_key: examKey.trim()
      };
      
      const res = await axios.post(`${base}/joinExam`, payload);
      
      if (res.data.success) {
        setSuccess('Successfully joined the exam!');
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
    <div className={`${styles.examinerContainer} ${styles.enterpriseRoot}`}>
      <div className={styles.pageBackdrop} />
      
      <header className={`${styles.header} ${styles.fadeIn}`}>
        <div className={styles.headerContent}>
          <h1 className={`${styles.title} ${styles.gradientText}`}>Join Exam</h1>
          <p className={styles.subtitle}>Enter your exam key to join the assessment</p>
        </div>
      </header>

      <section className={`${styles.examsSection} ${styles.fadeIn}`}>
        <div className={`${styles.glassPanel}`} style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
            <h2 style={{ color: '#e5e7eb', marginBottom: '0.5rem' }}>Ready to Start?</h2>
            <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
              Enter the exam key provided by your examiner
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="examKey" 
              style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#e5e7eb', 
                fontWeight: '500' 
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
              placeholder="Enter 6-digit exam key (e.g., 100001)"
              disabled={isJoining}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.1rem',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                color: '#e5e7eb',
                textAlign: 'center',
                letterSpacing: '2px',
                fontFamily: 'monospace'
              }}
              maxLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '6px',
              color: '#86efac',
              fontSize: '0.9rem'
            }}>
              {success}
            </div>
          )}

          <button
            onClick={handleJoinExam}
            disabled={isJoining || !examKey.trim()}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              opacity: (isJoining || !examKey.trim()) ? 0.6 : 1,
              cursor: (isJoining || !examKey.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {isJoining ? '🔄 Joining...' : '🚀 Join Exam'}
          </button>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: '6px' 
          }}>
            <h4 style={{ color: '#93c5fd', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              📋 Instructions
            </h4>
            <ul style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5', paddingLeft: '1rem' }}>
              <li>Enter the 6-digit exam key provided by your examiner</li>
              <li>Make sure you have a stable internet connection</li>
              <li>Ensure your camera and microphone are working</li>
              <li>Close all unnecessary applications before starting</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JoinExam;