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
  document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  window.location.href = "/login";
};
