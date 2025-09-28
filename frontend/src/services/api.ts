import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { username: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
}

export const modelsAPI = {
  getAll: () => api.get('/models'),
  getById: (id: string) => api.get(`/models/${id}`),
  create: (data: any) => api.post('/models/create', data),
  update: (id: string, data: any) => api.put(`/models/${id}`, data),
  delete: (id: string) => api.delete(`/models/${id}`),
  predict: (id: string, data: any) => api.post(`/models/${id}/predict`, data),
  export: (id: string, format: string) =>
    api.post(`/models/${id}/export`, { format }, { responseType: 'blob' }),
  getMetrics: (id: string) => api.get(`/models/${id}/metrics`),
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  userAction: (userId: string, action: string) =>
    api.post(`/admin/users/${userId}/${action}`),
  systemAction: (action: string) => api.post(`/admin/system/${action}`),
}