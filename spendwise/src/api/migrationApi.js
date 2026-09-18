import { apiClient } from './client.js';

export const migrationApi = {
  async migrateLocalDataToAccount(localData) {
    return apiClient('/migration/local-data', {
      method: 'POST',
      body: localData,
    });
  },
};
