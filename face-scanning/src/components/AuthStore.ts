let _userId: string | null = null;
let _userName: string | null = null;
let _userEmail: string | null = null;
let _locked = false;

// Initialize from localStorage if present
if (typeof window !== "undefined") {
  const sid = window.localStorage.getItem("userId");
  const sname = window.localStorage.getItem("userName");
  const semail = window.localStorage.getItem("userEmail");
  if (sid) {
    _userId = sid;
    _userName = sname;
    _userEmail = semail;
    _locked = true;
  }
}

export function setIdentity(name: string | undefined | null, id: string | number | undefined | null, email?: string | null) {
  if (_locked) return;
  _userName = name ?? null;
  _userId = id != null ? String(id) : null;
  _userEmail = email ?? null;
}

export function lockIdentity() {
  _locked = true;
}

export function getUserId(): string | null {
  return _userId;
}
export function getUserName(): string | null {
  return _userName;
}
export function getUserEmail(): string | null {
  return _userEmail;
}
export function isIdentityLocked(): boolean {
  return _locked;
}
