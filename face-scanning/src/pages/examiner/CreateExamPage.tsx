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
        const base = 'http://localhost:3001';
        const res = await axios.get(`${base}/exam`);
        console.log("re", res);
        if (!cancelled && res.data?.success && res.data?.exams) {
          setExams(res.data.exams);
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
      const base = 'http://localhost:3001';
      const payload = {
        exam_name: examName.trim(),
      };
      const res = await axios.post<Exam>(`${base}/examCreate`, payload);
      console.log("hi",res);
      
      // Refresh exams list after successful creation
      const refreshRes = await axios.get(`${base}/exam`);
      if (refreshRes.data?.success && refreshRes.data?.exams) {
        setExams(refreshRes.data.exams);
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
    <div className={`${styles.examinerContainer} ${styles.enterpriseRoot}`}>
      <div className={styles.pageBackdrop} />
      <header className={`${styles.header} ${styles.fadeIn}`}>
        <div className={styles.headerContent}>
          <h1 className={`${styles.title} ${styles.gradientText}`}>Exam Management Console</h1>
          <p className={styles.subtitle}>Create, monitor and manage assessments</p>
        </div>
        <div className={styles.headerActions}>
          <SearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.accentPulse}`}
          >
            {showCreateForm ? 'Close' : '➕ New Exam'}
          </button>
        </div>
      </header>

      <ExamStats stats={stats} />

      {showCreateForm && (
        <div className={`${styles.glassPanel}`} style={{ maxWidth: '600px', margin: '0 auto 2rem', padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#e5e7eb', marginBottom: '0.5rem' }}>Create New Exam</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Enter a name for your new exam</p>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e7eb', fontWeight: '500' }}>
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Enter exam name"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)',
                color: '#e5e7eb',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleCreateExam}
              disabled={isCreating || !examName.trim()}
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ 
                flex: 1,
                opacity: (isCreating || !examName.trim()) ? 0.6 : 1,
                cursor: (isCreating || !examName.trim()) ? 'not-allowed' : 'pointer'
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
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className={`${styles.examsSection} ${styles.fadeIn}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Exams ({filteredExams.length})</h2>
          {search && <span className={styles.filterInfo}>Filtered by: "{search}"</span>}
        </div>

        {loading && (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${styles.examCard} ${styles.skeletonCard} ${styles.shimmer}`} />
            ))}
          </div>
        )}

        {!loading && filteredExams.length === 0 && (
          <div className={`${styles.emptyState} ${styles.glassPanel}`}>
            <div className={styles.emptyContent}>
              <div className={styles.emptyIcon}>📁</div>
              <h3 className={styles.emptyTitle}>No exams match</h3>
              <p className={styles.emptyDescription}>Try adjusting your search or create a new exam.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className={`${styles.btn} ${styles.btnPrimary}`}
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