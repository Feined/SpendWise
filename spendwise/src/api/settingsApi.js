import { apiClient } from './client.js';

export const settingsApi = {
  async getSettings() {
    return apiClient('/settings');
  },

  async updateSettings(settings) {
    return apiClient('/settings', {
      method: 'PATCH',
      body: settings,
    });
  },
};
