import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const getTokenFromCookie = (): string | null => {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split("; ");
  const authCookie = cookies.find((cookie) => cookie.startsWith("authToken="));
  
  if (!authCookie) return null;
  
  return authCookie.split("=")[1];
};

export const decodeToken = (): DecodedToken | null => {
  try {
    const token = getTokenFromCookie();
    if (!token) return null;
    
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const getUserRole = (): string | null => {
  const decoded = decodeToken();
  return decoded?.role || null;
};

export const isAuthenticated = (): boolean => {
  const decoded = decodeToken();
  if (!decoded) return false;
  
  // Check if token is expired
  const currentTime = Date.now() / 1000;
  return decoded.exp > currentTime;
};

export const hasRole = (requiredRole: string | string[]): boolean => {
  const userRole = getUserRole();
  if (!userRole) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  return userRole === requiredRole;
};

export const getUserInfo = () => {
  return decodeToken();
};

export const logout = () => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }
  
  // Clear all auth-related cookies
  document.cookie = "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  
  // Clear localStorage
  if (window.localStorage) {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("globalName");
  }
  
  // Redirect to login
  window.location.href = "/";
};

/**
 * Get user profile initials from token
 * Returns first letters of name parts (max 2)
 */
export const getUserInitials = (): string => {
  try {
    const decoded = decodeToken();
    if (!decoded) return "U";
    
    const name = decoded.email.split("@")[0]; // Fallback to email prefix
    const parts = name.split(/[\s._-]+/);
    const initials = parts
      .map((p: string) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
    
    return initials || "U";
  } catch (error) {
    return "U";
  }
};

/**
 * Parse JWT token to get user name
 * Tries multiple possible name fields
 */
export const getUserName = (): string | null => {
  try {
    const token = getTokenFromCookie();
    if (!token) return null;
    
    const parts = token.split(".");
    if (parts.length < 2) return null;
    
    const payload = parts[1];
    const pad = payload.length % 4;
    const adjusted = payload + (pad ? "=".repeat(4 - pad) : "");
    const decoded = JSON.parse(window.atob(adjusted));
    
    return (
      decoded?.name ||
      decoded?.fullname ||
      decoded?.username ||
      decoded?.email ||
      null
    );
  } catch (error) {
    console.error("Error parsing user name:", error);
    return null;
  }
};
