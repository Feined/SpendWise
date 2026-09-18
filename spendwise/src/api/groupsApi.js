import { apiClient } from './client.js';

export const groupsApi = {
  async getGroups() {
    return apiClient('/groups');
  },

  async createGroup(groupData) {
    return apiClient('/groups', {
      method: 'POST',
      body: groupData,
    });
  },

  async getGroupDetails(id) {
    return apiClient(`/groups/${id}`);
  },

  async joinGroup(inviteCode) {
    return apiClient('/groups/join', {
      method: 'POST',
      body: { inviteCode },
    });
  },

  async addGroupMember(groupId, memberData) {
    return apiClient(`/groups/${groupId}/members`, {
      method: 'POST',
      body: memberData,
    });
  },

  async removeGroupMember(groupId, memberId) {
    return apiClient(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },
};
