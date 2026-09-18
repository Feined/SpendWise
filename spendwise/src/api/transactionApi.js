import { apiClient } from './client.js';

export const transactionApi = {
  async getTransactions(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiClient(`/transactions${query}`);
  },

  async createTransaction(transaction) {
    return apiClient('/transactions', {
      method: 'POST',
      body: transaction,
    });
  },

  async updateTransaction(id, updates) {
    return apiClient(`/transactions/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteTransaction(id) {
    return apiClient(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};
