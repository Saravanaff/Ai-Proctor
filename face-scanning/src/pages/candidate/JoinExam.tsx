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
    <div
      className={`${styles.examinerContainer} ${styles.enterpriseRoot}`}
      style={{
        background: '#0b0b0b',
        minHeight: '100vh',
        color: '#e5e7eb'
      }}
    >
      <div className={styles.pageBackdrop} style={{ opacity: 0 }} />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1
            className={styles.title}
            style={{ color: '#fafafa', letterSpacing: '-0.02em', fontWeight: 700 }}
          >
            Join Exam
          </h1>
          <p className={styles.subtitle} style={{ color: '#a3a3a3' }}>
            Enter your exam key to join the assessment
          </p>
        </div>
      </header>

      <section className={styles.examsSection}>
        <div
          className={styles.glassPanel}
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '28px',
            background: '#0f0f0f',
            border: '1px solid #1f1f1f',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)'
          }}
        >
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '20px', fontWeight: 600 }}>Ready to start?</h2>
            <p style={{ color: '#a3a3a3', marginTop: '6px', fontSize: '14px' }}>
              Enter the exam key provided by your examiner
            </p>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label 
              htmlFor="examKey" 
              style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4', fontWeight: 500 }}
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
              style={{
                width: '100%',
                padding: '14px 14px',
                fontSize: '15px',
                border: '1px solid #262626',
                borderRadius: 10,
                background: '#0a0a0a',
                color: '#fafafa',
                outline: 'none',
                transition: 'border-color .15s ease',
              }}
              maxLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              marginBottom: '14px',
              background: '#111111',
              border: '1px solid #303030',
              borderRadius: 10,
              color: '#f87171',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 12px',
              marginBottom: '14px',
              background: '#111111',
              border: '1px solid #303030',
              borderRadius: 10,
              color: '#34d399',
              fontSize: '13px'
            }}>
              {success}
            </div>
          )}

          <button
            onClick={handleJoinExam}
            disabled={isJoining || !examKey.trim()}
            className={`${styles.btn}`}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: 10,
              border: '1px solid #ffffff',
              background: '#ffffff',
              color: '#0a0a0a',
              opacity: (isJoining || !examKey.trim()) ? 0.6 : 1,
              cursor: (isJoining || !examKey.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all .15s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
            }}
          >
            {isJoining ? 'Joining…' : 'Join Exam'}
          </button>

          <div style={{ 
            marginTop: '18px', 
            padding: '14px', 
            background: '#0a0a0a',
            border: '1px solid #1f1f1f', 
            borderRadius: 10 
          }}>
            <h4 style={{ color: '#e5e5e5', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
              Instructions
            </h4>
            <ul style={{ color: '#a3a3a3', fontSize: '13px', lineHeight: 1.6, paddingLeft: '18px', margin: 0 }}>
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