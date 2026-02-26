import axios from 'axios';

// في التطوير: /api (يستخدم proxy)
// في الإنتاج: REACT_APP_API_URL = https://salla-loyalty-api.onrender.com/api
const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// إضافة التوكن تلقائياً
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// التعامل مع الأخطاء
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// === Auth API ===
export const authAPI = {
  verify: () => api.get('/auth/verify'),
  getLoginUrl: () => `${API_BASE}/auth/login`,
};

// === Merchant API ===
export const merchantAPI = {
  getProfile: () => api.get('/merchant/profile'),
};

// === Settings API ===
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// === Customers API ===
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
};

// === Points API ===
export const pointsAPI = {
  getTransactions: (params) => api.get('/points/transactions', { params }),
  addPoints: (data) => api.post('/points/add', data),
  deductPoints: (data) => api.post('/points/deduct', data),
  // مسارات العميل
  getMyHistory: (params) => api.get('/points/me/history', { params }),
};

// === Tiers API ===
export const tiersAPI = {
  getAll: () => api.get('/tiers'),
  create: (data) => api.post('/tiers', data),
  update: (id, data) => api.put(`/tiers/${id}`, data),
  delete: (id) => api.delete(`/tiers/${id}`),
};

// === Coupons API ===
export const couponsAPI = {
  getAll: (params) => api.get('/coupons', { params }),
  redeem: (data) => api.post('/coupons/redeem', data),
  getMyCoupons: () => api.get('/coupons/me'),
};

// === Stats API ===
export const statsAPI = {
  getStats: () => api.get('/stats'),
  getTopCustomers: () => api.get('/stats/top-customers'),
};

// === Customer Self-Service API ===
export const customerSelfAPI = {
  auth: (data) => api.post('/customers/auth', data),
  getProfile: () => api.get('/customers/me/profile'),
  getReferral: () => api.get('/customers/me/referral'),
};

export default api;
