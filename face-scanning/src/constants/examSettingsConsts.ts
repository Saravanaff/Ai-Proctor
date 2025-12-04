// ✅ LocalStorage key for exam settings
const EXAM_SETTINGS_KEY = 'ai_proctor_exam_settings';

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

// ✅ Initialize from localStorage
let _globalExamSettings: any = (() => {
  const stored = safeGetItem(EXAM_SETTINGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored exam settings:', error);
      return null;
    }
  }
  return null;
})();

export const setExamSettings = (data: any) => {
  _globalExamSettings = data;
  // ✅ Persist to localStorage
  if (data) {
    safeSetItem(EXAM_SETTINGS_KEY, JSON.stringify(data));
  } else {
    safeRemoveItem(EXAM_SETTINGS_KEY);
  }
}

export const getExamSettings = () => {
  // ✅ Try memory first, then localStorage
  if (_globalExamSettings) return _globalExamSettings;
  
  const stored = safeGetItem(EXAM_SETTINGS_KEY);
  if (stored) {
    try {
      _globalExamSettings = JSON.parse(stored);
      return _globalExamSettings;
    } catch (error) {
      console.error('Failed to parse stored exam settings:', error);
      return null;
    }
  }
  return null;
}

export const clearExamSettings = () => {
  _globalExamSettings = null;
  safeRemoveItem(EXAM_SETTINGS_KEY);
}