import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
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

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
  acceptCompanyInvite: (token, password) => api.post('/auth/company/accept-invite', { token, password }),
  verifyCompanyInvite: (token) => api.get(`/auth/company/verify-invite?token=${token}`),
  companyLogin: (credentials) => api.post('/auth/company/login', credentials),
};

// Customer API
export const customerAPI = {
  init: (data) => api.post('/customer/init', data),
  setCompany: (data) => api.put('/customer/set-company', data),
};

// Chat API
export const chatAPI = {
  createChat: (data) => api.post('/chat/create', data),
  getChat: (chatId, userId) => api.get(`/chat/${chatId}${userId ? `?userId=${userId}` : ''}`),
  getUserChats: (userId, companyId) => api.get(`/chat/user-chats?userId=${userId}${companyId ? `&companyId=${companyId}` : ''}`),
  getCompanyChats: () => api.get('/chat/company/history'),
  takeOverChat: (chatId, agentId) => api.post('/chat/takeover', { chatId, agentId }),
  closeChat: (chatId) => api.put(`/chat/${chatId}/close`),
  getActiveChats: () => api.get('/chat/active'),
};

// Company API (superuser only)
export const companyAPI = {
  create: (data) => api.post('/company', data),
  list: () => api.get('/company'),
  get: (id) => api.get(`/company/${id}`),
  update: (id, data) => api.put(`/company/${id}`, data),
  remove: (id) => api.delete(`/company/${id}`),
  assignUser: (userId, companyId) => api.post('/company/assign-user', { userId, companyId }),
};

// Knowledge Base API (company authenticated only)
export const kbAPI = {
  upload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/kb/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  listDocuments: () => api.get('/kb/documents'),
  getDocument: (docId) => api.get(`/kb/document/${docId}`),
  deleteDocument: (docId) => api.delete(`/kb/document/${docId}`),
  search: (query) => api.get(`/kb/search?q=${encodeURIComponent(query)}`),
};

// Notification API (agent/superuser only)
export const notificationAPI = {
  getUnread: () => api.get('/notifications?unreadOnly=true'),
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export default api;
