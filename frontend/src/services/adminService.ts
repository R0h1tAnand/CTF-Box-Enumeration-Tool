import api from './api';

/**
 * Admin service for interacting with admin API endpoints
 */
export const adminService = {
  /**
   * Get admin dashboard data
   * @returns Dashboard data
   */
  getDashboardData: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  /**
   * Get application logs
   * @param logType Log type (app, error, access, security)
   * @param lines Number of lines to retrieve
   * @returns Log data
   */
  getLogs: async (logType = 'app', lines = 100) => {
    const response = await api.get(`/api/admin/logs?type=${logType}&lines=${lines}`);
    return response.data;
  },

  /**
   * Get user list
   * @param page Page number
   * @param perPage Items per page
   * @param filters Filter parameters
   * @returns User list data
   */
  getUsers: async (page = 1, perPage = 20, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      ...filters
    });
    
    const response = await api.get(`/api/admin/users?${queryParams}`);
    return response.data;
  },

  /**
   * Clear application cache
   * @returns Response data
   */
  clearCache: async () => {
    const response = await api.post('/api/admin/cache/clear');
    return response.data;
  },

  /**
   * Reset performance metrics
   * @returns Response data
   */
  resetMetrics: async () => {
    const response = await api.post('/api/admin/metrics/reset');
    return response.data;
  }
};

export default adminService;