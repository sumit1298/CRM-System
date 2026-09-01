import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Leads
export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
};

// Contacts
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Opportunities
export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  getBoard: () => api.get('/opportunities/board'),
  getById: (id) => api.get(`/opportunities/${id}`),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  updateStage: (id, stage) => api.patch(`/opportunities/${id}/stage`, { stage }),
  delete: (id) => api.delete(`/opportunities/${id}`),
};

// Tasks
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Interactions
export const interactionsAPI = {
  getAll: (params) => api.get('/interactions', { params }),
  getById: (id) => api.get(`/interactions/${id}`),
  create: (data) => api.post('/interactions', data),
  update: (id, data) => api.put(`/interactions/${id}`, data),
  delete: (id) => api.delete(`/interactions/${id}`),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const analyticsAPI = {
  get: (params) => api.get('/analytics', { params }),
};

// AI
export const aiAPI = {
  leadSummary: (id) => api.post(`/ai/leads/${id}/summary`),
  riskScore: (id) => api.post(`/ai/opportunities/${id}/risk`),
  emailDraft: (id, context) => api.post(`/ai/leads/${id}/email`, { context }),
  nextAction: (id) => api.post(`/ai/leads/${id}/next-action`),
  pipelineHealth: () => api.get('/ai/pipeline-health'),
};

// Export
export const exportAPI = {
  leads: () => api.get('/export/leads', { responseType: 'blob' }),
  contacts: () => api.get('/export/contacts', { responseType: 'blob' }),
  opportunities: () => api.get('/export/opportunities', { responseType: 'blob' }),
  tasks: () => api.get('/export/tasks', { responseType: 'blob' }),
  interactions: () => api.get('/export/interactions', { responseType: 'blob' }),
};

export default api;