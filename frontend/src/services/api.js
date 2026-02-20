import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
  timeout: 15000,
});

// Flag to prevent refresh loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Attach JWT token to requests (for backward compatibility with Bearer token)
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 and refresh token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token
        await API.post('/auth/refresh');
        isRefreshing = false;
        processQueue(null);
        return API(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Clear auth data and redirect to login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const logout = () => API.post('/auth/logout', {});
export const refreshToken = () => API.post('/auth/refresh', {});

// Analyses
export const generateSummary = (data) => API.post('/analyses/generate', data, { timeout: 60000 });
export const getAnalysis = (id) => API.get(`/analyses/${id}`);
export const editAnalysis = (id, data) => API.patch(`/analyses/${id}`, data);
export const confirmSummary = (id, data) => API.post(`/analyses/${id}/confirm`, data);
export const analyzeExisting = (id) => API.post(`/analyses/${id}/analyze`, {}, { timeout: 60000 });

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
export const getMeetings = () => API.get('/tasks/meetings');
export const updateTask = (analysisId, taskId, data) => API.patch(`/tasks/${analysisId}/${taskId}`, data);
export const getMetrics = () => API.get('/tasks/metrics');

// Analytics
export const getAnalyticsOverview = () => API.get('/analytics/overview');
export const getAnalyticsTrends = (days = 30) => API.get('/analytics/trends', { params: { days } });
export const getTeamPerformance = () => API.get('/analytics/team-performance');

// Search
export const searchAnalyses = (query, filters = {}) => API.get('/analyses/search', {
  params: {
    q: query,
    ...filters,
  }
});

// File Upload
export const uploadMeetingFile = (formData) => API.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  timeout: 30000, // 30 seconds for file upload
});

export default API;
