let _globalName = "";
let _globalId: string | null = null;
let _globalEmail: string | null = null;

// No initial read from localStorage; start empty by default

export function setGlobalIdentity(name: string, email: string | null | undefined, id: string | number | null | undefined) {
  _globalName = name || "";
  _globalEmail = email ?? null;
  _globalId = id != null ? String(id) : null;
}

// Backward-compatible setters
export function setGlobalName(name: string) {
  _globalName = name || "";
}
export function setUserId(id: string | number | null | undefined) {
  _globalId = id != null ? String(id) : null;
}

export function getTokenFromCookie(name='authToken'):string | null{
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

// Getters for individual attributes
export function getGlobalName(): string {
  return _globalName;
}
export function getUserId(): string | null {
  return _globalId;
}
export function getUserEmail(): string | null {
  return _globalEmail;
}
