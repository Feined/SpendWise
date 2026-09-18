import { apiClient } from './client.js';

export const friendApi = {
  async getFriends() {
    return apiClient('/friends');
  },

  async createFriend(friendData) {
    return apiClient('/friends', {
      method: 'POST',
      body: friendData,
    });
  },

  async deleteFriend(id) {
    return apiClient(`/friends/${id}`, {
      method: 'DELETE',
    });
  },

  async searchUsers(query) {
    return apiClient(`/friends/search?q=${encodeURIComponent(query)}`);
  },

  async sendFriendRequest(target) {
    const payload = typeof target === 'string'
      ? (target.includes('@') ? { email: target } : { targetUserId: target })
      : target;
    return apiClient('/friends/request', {
      method: 'POST',
      body: payload,
    });
  },

  async getFriendRequests() {
    return apiClient('/friends/requests');
  },

  async acceptFriendRequest(id) {
    return apiClient(`/friends/requests/${id}/accept`, {
      method: 'POST',
    });
  },

  async declineFriendRequest(id) {
    return apiClient(`/friends/requests/${id}/decline`, {
      method: 'POST',
    });
  },
};
