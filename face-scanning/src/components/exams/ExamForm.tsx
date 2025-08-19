import React from 'react';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  examName: string;
  setExamName: (v: string) => void;
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  confirmedStart: boolean;
  confirmedEnd: boolean;
  confirmStart: () => void;
  confirmEnd: () => void;
  timeValid: boolean;
  isCreating: boolean;
  onCreate: () => void;
  onCancel: () => void;
}

const ExamForm: React.FC<Props> = ({
  examName, setExamName,
  startTime, endTime,
  onStartChange, onEndChange,
  confirmedStart, confirmedEnd,
  confirmStart, confirmEnd,
  timeValid, isCreating,
  onCreate, onCancel
}) => (
  <div className={`${styles.createFormCard} ${styles.glassPanel} ${styles.slideDown}`}>
    <div className={styles.cardHeader}>
      <h3 className={styles.formTitle}>Create New Exam</h3>
      <p className={styles.formDescription}>Provide a distinguishable name. Configure details later.</p>
    </div>
    <div className={styles.cardContent}>
      <div className={`${styles.inputGroup} ${styles.nameGroup}`}>
        <label htmlFor="examName" className={styles.label}>Exam Name</label>
        <input
          id="examName"
          type="text"
            value={examName}
            onChange={e => setExamName(e.target.value)}
          placeholder="e.g. Q1 Technical Assessment"
          className={styles.largeInput}
          autoFocus
        />
      </div>
      <div className={styles.timeSection}>
        <div className={styles.timeSectionHeader}>
          <span className={styles.timeSectionTitle}>Availability Window</span>
          <span className={styles.timeSectionHint}>Set when candidates can join</span>
        </div>
        <div className={styles.timeRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="examStart" className={styles.label}>Start Time</label>
            <div className={styles.inlineConfirm}>
              <input
                id="examStart"
                type="datetime-local"
                value={startTime}
                onChange={e => onStartChange(e.target.value)}
                className={`${styles.largeInput} ${!timeValid && startTime && endTime ? styles.inputInvalid : ''}`}
              />
              <button
                type="button"
                onClick={confirmStart}
                disabled={!startTime || confirmedStart}
                className={`${styles.okButton} ${confirmedStart ? styles.okButtonDone : ''}`}
              >
                {confirmedStart ? '✓' : 'OK'}
              </button>
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="examEnd" className={styles.label}>End Time</label>
            <div className={styles.inlineConfirm}>
              <input
                id="examEnd"
                type="datetime-local"
                value={endTime}
                onChange={e => onEndChange(e.target.value)}
                className={`${styles.largeInput} ${!timeValid && startTime && endTime ? styles.inputInvalid : ''}`}
              />
              <button
                type="button"
                onClick={confirmEnd}
                disabled={!endTime || !timeValid || confirmedEnd}
                className={`${styles.okButton} ${confirmedEnd ? styles.okButtonDone : ''}`}
              >
                {confirmedEnd ? '✓' : 'OK'}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.helperTextRow}>
          <p className={styles.helperText}>Users can enter only between confirmed times.</p>
          {(!confirmedStart || !confirmedEnd) && (startTime || endTime) && (
            <p className={styles.pendingConfirm}>Press OK to lock each time.</p>
          )}
        </div>
        {!timeValid && startTime && endTime && (
          <p className={styles.errorText}>End time must be after start time.</p>
        )}
      </div>
      <div className={styles.buttonGroup}>
        <button
          onClick={onCreate}
          disabled={
            !examName.trim() || isCreating || !startTime || !endTime || !timeValid || !confirmedStart || !confirmedEnd
          }
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {isCreating ? 'Creating…' : 'Create Exam'}
        </button>
        <button onClick={onCancel} className={`${styles.btn} ${styles.btnOutline}`}>Cancel</button>
      </div>
    </div>
  </div>
);

export default ExamForm;
