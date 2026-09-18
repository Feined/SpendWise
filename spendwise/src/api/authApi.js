import {
  apiClient,
  setAuthToken,
  setRefreshToken,
  getRefreshToken,
  clearAuthTokens,
} from './client.js';

export const authApi = {
  async register({ email, password, name }) {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    if (res?.token) {
      setAuthToken(res.token);
    }
    if (res?.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    return res;
  },

  async login({ email, password }) {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res?.token) {
      setAuthToken(res.token);
    }
    if (res?.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    return res;
  },

  async refresh(refreshTokenParam) {
    const refreshToken = refreshTokenParam || getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const res = await apiClient('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    if (res?.token) {
      setAuthToken(res.token);
    }
    if (res?.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    return res;
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      }
    } catch (err) {
      console.warn('[SpendWise Auth] Remote logout error:', err.message);
    } finally {
      clearAuthTokens();
    }
  },

  async getMe() {
    return apiClient('/auth/me');
  },
};
