import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT token to every request
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

// Global error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // Only redirect if not already on auth pages to prevent infinite loops
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Analyses
export const generateSummary = (data) => API.post('/analyses/generate', data, { timeout: 60000 });
export const getAnalysis = (id) => API.get(`/analyses/${id}`);
export const editAnalysis = (id, data) => API.patch(`/analyses/${id}`, data);
export const confirmSummary = (id, data) => API.post(`/analyses/${id}/confirm`, data);
export const analyzeExisting = (id) => API.post(`/analyses/${id}/analyze`, {}, { timeout: 60000 });

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
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
