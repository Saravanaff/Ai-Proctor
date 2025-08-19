import React, { useState, useEffect, useMemo } from 'react';
import styles from '../../styles/CreateExamPage.module.css';
import { Exam } from '../../types/exam';
import SearchBar from '../../components/exams/SearchBar';
import ExamStats from '../../components/exams/ExamStats';
import ExamForm from '../../components/exams/ExamForm';
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [confirmedStart, setConfirmedStart] = useState(false);
  const [confirmedEnd, setConfirmedEnd] = useState(false);
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
        const res = await axios.get(`${base}/exam`,);
        console.log("re",res);
        if (!cancelled) setExams(res.data);
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
    if (!timeValid) return;
    console.log(getTokenFromCookie());
    setIsCreating(true);
    try {
      const base = 'http://localhost:3001';
      const payload = {
        exam_name: examName.trim(),
        // startTime: startTime || null,
        // endTime: endTime || null
      };
      const res = await axios.post<Exam>(`${base}/examCreate`, payload);
      console.log("hi",res);
      setExamName('');
      setStartTime('');
      setEndTime('');
      setConfirmedStart(false);
      setConfirmedEnd(false);
      setShowCreateForm(false);
    } catch (e: any) {
      // Optionally reuse main error
      setError(e?.response?.data?.message || e.message || 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  // time helpers
  const onChangeStart = (v: string) => { setStartTime(v); setConfirmedStart(false); };
  const onChangeEnd = (v: string) => { setEndTime(v); setConfirmedEnd(false); };
  const confirmStart = () => { if (startTime) setConfirmedStart(true); };
  const confirmEnd = () => { if (endTime && timeValid) setConfirmedEnd(true); };

  // derived
  const filteredExams = useMemo(
    () => exams.filter(e => e.name.toLowerCase().includes(search.toLowerCase())),
    [exams, search]
  );
  const stats = useMemo(() => ({
    total: exams.length,
    active: exams.filter(e => e.status === 'active').length,
    draft: exams.filter(e => e.status === 'draft').length,
    completed: exams.filter(e => e.status === 'completed').length
  }), [exams]);

  const timeValid = !startTime || !endTime || new Date(startTime) < new Date(endTime);

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
        <ExamForm
          examName={examName}
          setExamName={setExamName}
          startTime={startTime}
          endTime={endTime}
          onStartChange={onChangeStart}
          onEndChange={onChangeEnd}
          confirmedStart={confirmedStart}
          confirmedEnd={confirmedEnd}
          confirmStart={confirmStart}
          confirmEnd={confirmEnd}
          timeValid={timeValid}
          isCreating={isCreating}
          onCreate={handleCreateExam}
          onCancel={() => {
            setShowCreateForm(false);
            setExamName(''); setStartTime(''); setEndTime('');
            setConfirmedStart(false); setConfirmedEnd(false);
          }}
        />
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