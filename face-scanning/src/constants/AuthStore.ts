// ✅ LocalStorage keys
const STORAGE_KEYS = {
  NAME: 'ai_proctor_user_name',
  ID: 'ai_proctor_user_id',
  EMAIL: 'ai_proctor_user_email',
  EXAM_ID: 'ai_proctor_exam_id',
  EXAM_START_TIME: 'ai_proctor_exam_start_time',
};

// ✅ Helper functions for safe localStorage access
const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read from localStorage: ${key}`, error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to write to localStorage: ${key}`, error);
  }
};

const safeRemoveItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove from localStorage: ${key}`, error);
  }
};

// ✅ Initialize from localStorage on module load
let _globalName = safeGetItem(STORAGE_KEYS.NAME) || "";
let _globalId: string | null = safeGetItem(STORAGE_KEYS.ID);
let _globalEmail: string | null = safeGetItem(STORAGE_KEYS.EMAIL);
let _globalExamId: string = safeGetItem(STORAGE_KEYS.EXAM_ID) || "unknown";

export function setGlobalIdentity(name: string, email: string | null | undefined, id: string | number | null | undefined) {
  _globalName = name || "";
  _globalEmail = email ?? null;
  _globalId = id != null ? String(id) : null;
  
  // ✅ Persist to localStorage
  safeSetItem(STORAGE_KEYS.NAME, _globalName);
  if (_globalEmail) safeSetItem(STORAGE_KEYS.EMAIL, _globalEmail);
  if (_globalId) safeSetItem(STORAGE_KEYS.ID, _globalId);
}

// Backward-compatible setters
export function setGlobalName(name: string) {
  _globalName = name || "";
  safeSetItem(STORAGE_KEYS.NAME, _globalName);
}

export function setUserId(id: string | number | null | undefined) {
  _globalId = id != null ? String(id) : null;
  if (_globalId) {
    safeSetItem(STORAGE_KEYS.ID, _globalId);
  } else {
    safeRemoveItem(STORAGE_KEYS.ID);
  }
}

export function setExamId(examId: string) {
  _globalExamId = examId;
  safeSetItem(STORAGE_KEYS.EXAM_ID, examId);
  // ✅ Also store exam start time for tracking
  safeSetItem(STORAGE_KEYS.EXAM_START_TIME, new Date().toISOString());
}

export function getTokenFromCookie(name='authToken'):string | null{
    // Only access document.cookie on the client side
    if (typeof window === 'undefined') {
        return null;
    }
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

// Getters for individual attributes
export function getGlobalName(): string {
  return _globalName || safeGetItem(STORAGE_KEYS.NAME) || "";
}

export function getUserId(): string | null {
  return _globalId || safeGetItem(STORAGE_KEYS.ID);
}

export function getUserEmail(): string | null {
  return _globalEmail || safeGetItem(STORAGE_KEYS.EMAIL);
}

export function getExamId(): string {
  return _globalExamId || safeGetItem(STORAGE_KEYS.EXAM_ID) || "unknown";
}

// ✅ New utility functions
export function getExamStartTime(): string | null {
  return safeGetItem(STORAGE_KEYS.EXAM_START_TIME);
}

export function clearExamData(): void {
  safeRemoveItem(STORAGE_KEYS.EXAM_ID);
  safeRemoveItem(STORAGE_KEYS.EXAM_START_TIME);
  _globalExamId = "unknown";
}

export function clearAllUserData(): void {
  safeRemoveItem(STORAGE_KEYS.NAME);
  safeRemoveItem(STORAGE_KEYS.ID);
  safeRemoveItem(STORAGE_KEYS.EMAIL);
  safeRemoveItem(STORAGE_KEYS.EXAM_ID);
  safeRemoveItem(STORAGE_KEYS.EXAM_START_TIME);
  _globalName = "";
  _globalId = null;
  _globalEmail = null;
  _globalExamId = "unknown";
}

// ✅ Validation helpers
export function hasValidExamId(): boolean {
  const examId = getExamId();
  return examId !== "unknown" && examId !== "" && examId !== null;
}

export function hasValidUserId(): boolean {
  const userId = getUserId();
  return userId !== null && userId !== "" && userId !== "unknown";
}
