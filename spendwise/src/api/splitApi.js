import { apiClient } from './client.js';

export const splitApi = {
  async getSplits() {
    return apiClient('/splits');
  },

  async createSplit(splitData) {
    return apiClient('/splits', {
      method: 'POST',
      body: splitData,
    });
  },

  async getSplitById(id) {
    return apiClient(`/splits/${id}`);
  },

  async settleSplit(id, settlementData) {
    return apiClient(`/splits/${id}/settle`, {
      method: 'POST',
      body: settlementData,
    });
  },

  async deleteSplit(id) {
    return apiClient(`/splits/${id}`, {
      method: 'DELETE',
    });
  },
};
