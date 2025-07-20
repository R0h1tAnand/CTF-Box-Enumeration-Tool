import { apiUtils } from './apiClient';
import type { User } from '../types/auth';
import type { UserSettings } from '../types/settings';

interface ProfileUpdateData {
  username?: string;
  email?: string;
  profile_picture?: File;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

interface PreferencesUpdateData {
  theme?: 'light' | 'dark';
  default_tools?: string[];
  notifications_enabled?: boolean;
  default_wordlist?: string;
  auto_export?: boolean;
}

export const settingsService = {
  /**
   * Get user profile information
   */
  async getProfile(): Promise<User> {
    return apiUtils.get<User>('/api/settings/profile');
  },

  /**
   * Update user profile information
   */
  async updateProfile(data: ProfileUpdateData): Promise<{ message: string }> {
    return apiUtils.put<{ message: string }>('/api/settings/profile', data);
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> {
    return apiUtils.uploadFile<{ url: string }>('/api/settings/profile/picture', file, onProgress);
  },

  /**
   * Change user password
   */
  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    return apiUtils.post<{ message: string }>('/api/settings/password', data);
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserSettings> {
    return apiUtils.get<UserSettings>('/api/settings/preferences');
  },

  /**
   * Update user preferences
   */
  async updatePreferences(data: PreferencesUpdateData): Promise<{ message: string }> {
    return apiUtils.put<{ message: string }>('/api/settings/preferences', data);
  },

  /**
   * Get available security tools
   */
  async getAvailableTools(): Promise<string[]> {
    return apiUtils.get<string[]>('/api/settings/tools/available');
  },

  /**
   * Get available wordlists
   */
  async getAvailableWordlists(): Promise<string[]> {
    return apiUtils.get<string[]>('/api/settings/wordlists');
  },

  /**
   * Upload custom wordlist
   */
  async uploadWordlist(file: File, onProgress?: (progress: number) => void): Promise<{ path: string }> {
    return apiUtils.uploadFile<{ path: string }>('/api/settings/wordlists/upload', file, onProgress);
  },

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<{ message: string }> {
    return apiUtils.post<{ message: string }>('/api/settings/account/delete', { password });
  },

  /**
   * Export user data
   */
  async exportUserData(): Promise<void> {
    return apiUtils.downloadFile('/api/settings/account/export', 'user_data.json');
  },

  /**
   * Get user activity logs
   */
  async getActivityLogs(page: number = 1, perPage: number = 10): Promise<{
    logs: ActivityLog[];
    pagination: {
      total: number;
      pages: number;
      page: number;
      per_page: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }> {
    return apiUtils.get(`/api/settings/account/activity?page=${page}&per_page=${perPage}`);
  }
};