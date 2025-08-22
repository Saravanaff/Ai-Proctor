import React, { useState, useEffect, useMemo } from 'react';
import styles from '../../styles/CreateExamPage.module.css';
import { Exam } from '../../types/exam';
import SearchBar from '../../components/exams/SearchBar';
import ExamStats from '../../components/exams/ExamStats';
import ExamsGrid from '../../components/exams/ExamsGrid';
import axios from 'axios';
import { getUserId,getTokenFromCookie } from '@/constants/AuthStore';
const CreateExam = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examName, setExamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error,setError]=useState(null);
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


   useEffect(() => {
    let cancelled = false;
    const fetchExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = 'https://localhost:3002';
        const res = await axios.get(`${base}/exam`);
        console.log("re", res);
        if (!cancelled && res.data?.success && res.data?.exams) {
          // Enhance exam data with participant counts from attendances
          const examsWithParticipants = res.data.exams.map((exam: any) => ({
            ...exam,
            participants: exam.attendances ? exam.attendances.length : 0,
            status: exam.status || 'draft', // Default status if not provided
            exam_key: exam.key || exam.exam_key, // Normalize key field
            startTime: exam.startTime || exam.start_time,
            endTime: exam.endTime || exam.end_time
          }));
          setExams(examsWithParticipants);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e.message || 'Failed to load exams');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchExams();
    return () => { cancelled = true; };
  }, []);

  const handleCreateExam = async () => {
    if (!examName.trim()) return;
    console.log(getTokenFromCookie());
    setIsCreating(true);
    try {
      const base = 'https://localhost:3002';
      const payload = {
        exam_name: examName.trim(),
      };
      const res = await axios.post<Exam>(`${base}/examCreate`, payload);
      console.log("hi",res);
      
      // Refresh exams list after successful creation
      const refreshRes = await axios.get(`${base}/exam`);
      if (refreshRes.data?.success && refreshRes.data?.exams) {
        const examsWithParticipants = refreshRes.data.exams.map((exam: any) => ({
          ...exam,
          participants: exam.attendances ? exam.attendances.length : 0,
          status: exam.status || 'draft',
          exam_key: exam.key || exam.exam_key,
          startTime: exam.startTime || exam.start_time,
          endTime: exam.endTime || exam.end_time
        }));
        setExams(examsWithParticipants);
      }
      
      setExamName('');
      setShowCreateForm(false);
    } catch (e: any) {
      // Optionally reuse main error
      setError(e?.response?.data?.message || e.message || 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  // derived
  const filteredExams = useMemo(
    () => exams.filter(e => {
      const examName = (e as any).exam_name || (e as any).name || '';
      return examName.toLowerCase().includes(search.toLowerCase());
    }),
    [exams, search]
  );
  const stats = useMemo(() => ({
    total: exams.length,
    active: exams.filter(e => e.status === 'active').length,
    draft: exams.filter(e => e.status === 'draft').length,
    completed: exams.filter(e => e.status === 'completed').length
  }), [exams]);

  const formatRange = (s?: string, e?: string) => {
    if (!s || !e) return '—';
    const sd = new Date(s); const ed = new Date(e);
    return `${sd.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} → ${ed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
  };

  return (
    <div className={`${styles.examinerContainer} ${styles.enterpriseRoot}`} style={{ background: '#0b0b0b', minHeight: '100vh' }}>
      <div className={styles.pageBackdrop} style={{ display: 'none' }} />
      <header className={`${styles.header} ${styles.fadeIn}`} style={{ background: 'transparent', borderBottom: '1px solid #1a1a1a', paddingBottom: '20px' }}>
        <div className={styles.headerContent}>
          <h1 className={styles.title} style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Exam Management Console</h1>
          <p className={styles.subtitle} style={{ color: '#a3a3a3', fontSize: '16px', margin: '8px 0 0 0' }}>Create, monitor and manage assessments</p>
        </div>
        <div className={styles.headerActions} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <SearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{
              background: '#ffffff',
              border: '1px solid #ffffff',
              color: '#0a0a0a',
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {showCreateForm ? 'Close' : '➕ New Exam'}
          </button>
        </div>
      </header>

      <ExamStats stats={stats} />

      {showCreateForm && (
        <div 
          className={`${styles.glassPanel}`} 
          style={{ 
            maxWidth: '600px', 
            margin: '0 auto 2rem', 
            padding: '24px', 
            background: '#0f0f0f', 
            border: '1px solid #1f1f1f', 
            borderRadius: '12px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)' 
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>Create New Exam</h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Enter a name for your new exam</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4', fontWeight: 500, fontSize: '14px' }}>
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Enter exam name"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #262626',
                borderRadius: '10px',
                background: '#0a0a0a',
                color: '#fafafa',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreateExam}
              disabled={isCreating || !examName.trim()}
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ 
                flex: 1,
                background: '#ffffff',
                border: '1px solid #ffffff',
                color: '#0a0a0a',
                padding: '12px 18px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                opacity: (isCreating || !examName.trim()) ? 0.6 : 1,
                cursor: (isCreating || !examName.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isCreating ? 'Creating...' : 'Create Exam'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setExamName('');
              }}
              className={`${styles.btn} ${styles.btnGhost}`}
              style={{
                border: '1px solid #2c2c2c',
                background: 'transparent',
                color: '#e5e5e5',
                padding: '12px 18px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className={`${styles.examsSection} ${styles.fadeIn}`}>
        <div className={styles.sectionHeader} style={{ borderBottom: '1px solid #1f1f1f', paddingBottom: '16px', marginBottom: '24px' }}>
          <h2 className={styles.sectionTitle} style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: 0 }}>Exams ({filteredExams.length})</h2>
          {search && <span className={styles.filterInfo} style={{ color: '#a3a3a3', fontSize: '14px' }}>Filtered by: "{search}"</span>}
        </div>

        {loading && (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${styles.examCard} ${styles.skeletonCard} ${styles.shimmer}`} style={{ background: '#0f0f0f', border: '1px solid #1f1f1f' }} />
            ))}
          </div>
        )}

        {!loading && filteredExams.length === 0 && (
          <div className={`${styles.emptyState} ${styles.glassPanel}`} style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
            <div className={styles.emptyContent}>
              <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <h3 className={styles.emptyTitle} style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No exams match</h3>
              <p className={styles.emptyDescription} style={{ color: '#a3a3a3', fontSize: '14px', marginBottom: '24px' }}>Try adjusting your search or create a new exam.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid #ffffff',
                  color: '#0a0a0a',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ➕ Create Exam
              </button>
            </div>
          </div>
        )}

        {!loading && filteredExams.length > 0 && (
          <ExamsGrid exams={filteredExams} formatRange={formatRange} />
        )}
      </section>
    </div>
  );
};

export default CreateExam;