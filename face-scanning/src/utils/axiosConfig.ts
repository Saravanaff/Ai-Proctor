import axios, { AxiosInstance } from "axios";
import { getTokenFromCookie } from "./auth";

/**
 * Configure axios instance with authentication interceptor
 * This function should be called once in the application lifecycle
 * to avoid duplicate interceptors
 */
let isInterceptorConfigured = false;

export const configureAxiosInterceptor = (): void => {
  if (isInterceptorConfigured) {
    return; // Prevent duplicate interceptor registration
  }

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        // Ensure headers exists
        config.headers = config.headers ?? ({} as any);

        // Handle both AxiosHeaders API and plain object
        if (typeof (config.headers as any).set === "function") {
          // AxiosHeaders API
          (config.headers as any).set("Authorization", `Bearer ${token}`);
        } else {
          // Plain object
          (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  isInterceptorConfigured = true;
};

/**
 * Create a custom axios instance with authentication
 * Use this for components that need their own instance
 */
export const createAuthenticatedAxiosInstance = (): AxiosInstance => {
  const instance = axios.create();

  instance.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        config.headers = config.headers ?? ({} as any);
        
        if (typeof (config.headers as any).set === "function") {
          (config.headers as any).set("Authorization", `Bearer ${token}`);
        } else {
          (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
};
