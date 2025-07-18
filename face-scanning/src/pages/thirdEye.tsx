'use client';
import { useState, useRef } from 'react';
import styles from '../styles/ThirdEye.module.css';
import { useRouter } from 'next/navigation';

type Status = 'pending' | 'checking' | 'success' | 'denied';

export default function Verification() {
  const [videoStatus, setVideoStatus] = useState<Status>('pending');
  const [audioStatus, setAudioStatus] = useState<Status>('pending');
  const [allDone, setAllDone] = useState(false);
  const router = useRouter();

  const checkPermissions = async () => {
    setVideoStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      stream.getTracks().forEach((track) => track.stop());
      setVideoStatus('success');
    } catch {
      setVideoStatus('denied');
    }

    setAudioStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setAudioStatus('success');
    } catch {
      setAudioStatus('denied');
    }

    setAllDone(true);
  };

  const renderStatusIcon = (status: Status) => {
    switch (status) {
      case 'checking':
        return <span className={styles.tick}>⏳</span>;
      case 'success':
        return <span className={styles.tick}>✅</span>;
      case 'denied':
        return <span className={styles.tick}>❌</span>;
      case 'pending':
        return <span className={styles.tick}>🟡</span>;
    }
  };

  const isVerified = videoStatus === 'success' && audioStatus === 'success';

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Place Mobile Beside Laptop for Proctoring</h2>

      <div className={styles.svgContainer}>
        <svg width="200" height="150" viewBox="0 0 300 200">
          <rect x="50" y="80" width="200" height="100" fill="#ccc" rx="10" />
          <rect x="220" y="40" width="40" height="100" fill="#3b82f6" rx="6" />
          <circle cx="240" cy="100" r="5" fill="#111" />
        </svg>
      </div>

      <div className={styles.permissionGroup}>
        <div>{renderStatusIcon(videoStatus)} <span>Camera Access</span></div>
        <div>{renderStatusIcon(audioStatus)} <span>Microphone Access</span></div>
      </div>

      <button className={styles.btn} onClick={checkPermissions}>
        Check Permissions
      </button>

      {allDone && (
        <>
          <div
            className={styles.permissionGroup}
            style={{ color: isVerified ? 'green' : 'red', fontWeight: 'bold' }}
          >
            {isVerified ? '✅ Verification Complete' : '❌ Verification Failed'}
          </div>
          <button
            className={`${styles.btn} ${isVerified ? styles.startBtn : ''}`}
            disabled={!isVerified}
            onClick={() => router.push('/video')}
          >
            {isVerified ? 'Start Proctoring' : 'Permission Denied'}
          </button>
        </>
      )}
    </div>
  );
}
