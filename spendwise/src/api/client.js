// SpendWise Centralized API Client
// Handles JWT authentication, automatic token refresh rotation, and offline resilience.

function resolveApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_STORAGE_KEY = 'spendwise_auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'spendwise_refresh_token';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage access might be restricted in some iframe/webview modes
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token) {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage access might be restricted
  }
}

export function clearAuthTokens() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Storage access might be restricted
  }
}

// Concurrency queue for automatic 401 token refresh
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers.forEach((cb) => cb(null));
  refreshSubscribers = [];
}

/**
 * Execute HTTP request against SpendWise API
 */
export async function apiClient(
  endpoint,
  { body, method = 'GET', customHeaders = {}, timeoutMs = 12000, _isRetry = false } = {}
) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check for 401 Unauthorized to trigger automatic refresh token flow
    const isAuthEndpoint = cleanEndpoint.startsWith('/auth/login') ||
      cleanEndpoint.startsWith('/auth/register') ||
      cleanEndpoint.startsWith('/auth/refresh');

    if (response.status === 401 && !isAuthEndpoint && !_isRetry) {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccessToken = refreshData.token;
              const newRefreshToken = refreshData.refreshToken;

              setAuthToken(newAccessToken);
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
              }

              isRefreshing = false;
              onRefreshed(newAccessToken);

              // Retry original request with newly refreshed token
              return apiClient(endpoint, {
                body,
                method,
                customHeaders: {
                  ...customHeaders,
                  Authorization: `Bearer ${newAccessToken}`,
                },
                timeoutMs,
                _isRetry: true,
              });
            } else {
              // Refresh token is expired or invalid
              isRefreshing = false;
              clearAuthTokens();
              onRefreshFailed();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('spendwise:session-expired'));
              }
            }
          } catch (refreshErr) {
            isRefreshing = false;
            onRefreshFailed();
            throw refreshErr;
          }
        } else {
          // Another request is already refreshing the token, wait for it
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              if (newToken) {
                resolve(
                  apiClient(endpoint, {
                    body,
                    method,
                    customHeaders: {
                      ...customHeaders,
                      Authorization: `Bearer ${newToken}`,
                    },
                    timeoutMs,
                    _isRetry: true,
                  })
                );
              } else {
                const err = new Error('Session expired. Please sign in again.');
                err.status = 401;
                reject(err);
              }
            });
          });
        }
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.details = data?.details;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const timeoutError = new Error('Network request timed out. Please check your connection.');
      timeoutError.isNetworkError = true;
      throw timeoutError;
    }

    if (
      (typeof window !== 'undefined' && !window.navigator.onLine) ||
      err.message?.includes('Failed to fetch')
    ) {
      err.isNetworkError = true;
      err.isOffline = true;
    }

    throw err;
  }
}
