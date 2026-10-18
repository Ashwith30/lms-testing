import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:8000/api',
});

// Request interceptor: attach bearer token
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('lms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Graceful handling if localStorage is restricted
  }
  return config;
});

// Track redirection in progress to prevent duplicate/repeated redirects from concurrent 401 responses
let isRedirecting = false;

export const resetRedirectState = () => {
  isRedirecting = false;
};

export const getRedirectState = () => isRedirecting;

export const clearAuthState = () => {
  try {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_current_user');
  } catch {
    // Safely ignore if localStorage is unavailable
  }
};

export const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  // Match login and registration endpoints where 401 is a credential failure rather than session expiry
  return (
    url.includes('/auth/login') ||
    url.endsWith('/login') ||
    url.includes('/auth/register')
  );
};

export const isAuthRoute = (pathname?: string): boolean => {
  if (!pathname) return false;
  const path = pathname.toLowerCase();
  return (
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/student/login' ||
    path === '/trainer/login' ||
    path === '/institution/login' ||
    path === '/admin/login' ||
    path === '/student/register' ||
    path.startsWith('/register')
  );
};

// Response interceptor: handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Only handle HTTP 401 Unauthorized responses
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url;

      // Do NOT log out or redirect if the 401 was caused by a login/auth credential failure
      if (!isAuthEndpoint(requestUrl)) {
        // Clear authentication tokens and cached user state
        clearAuthState();

        if (typeof window !== 'undefined') {
          // Notify React AuthContext and other components
          try {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          } catch {
            // Fallback if CustomEvent is unsupported
          }

          // Check current pathname to prevent redirect loops or repeated redirects
          const currentPath = window.location.pathname || '';
          if (!isAuthRoute(currentPath) && !isRedirecting) {
            isRedirecting = true;
            window.location.href = '/login';
          }
        }
      }
    }

    // Do NOT log out or redirect for HTTP 403, 404, 500, or network errors
    // Always propagate rejection to caller for local handling
    return Promise.reject(error);
  }
);

