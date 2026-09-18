import { apiClient } from './client.js';

export const budgetApi = {
  async getMonthPlans() {
    return apiClient('/budget/month-plans');
  },

  async getMonthPlan(monthKey) {
    return apiClient(`/budget/month-plans/${encodeURIComponent(monthKey)}`);
  },

  async upsertMonthPlan(monthKey, planData) {
    return apiClient(`/budget/month-plans/${encodeURIComponent(monthKey)}`, {
      method: 'PUT',
      body: planData,
    });
  },
};
