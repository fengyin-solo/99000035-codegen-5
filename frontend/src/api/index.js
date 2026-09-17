import axios from 'axios'
import { getToken } from '../utils/session'
import { authEvents } from '../utils/authEvents'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // 登录/注册接口的 401 是凭证填写错误，交给页面处理，不触发退出跳转
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register')

      if (!isAuthRequest) {
        const code = error.response.data?.code || 'TOKEN_INVALID'
        authEvents.emit('session-expired', {
          code,
          // 保留刚才正在看的入口地址，重新登录后回到这里
          redirect: window.location.pathname + window.location.search,
        })
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
}

// Links API
export const linksApi = {
  getLinks: (params) => api.get('/links', { params }),
  createLink: (data) => api.post('/links', data),
  updateLink: (id, data) => api.put(`/links/${id}`, data),
  deleteLink: (id) => api.delete(`/links/${id}`),
  getReadLater: (params) => api.get('/links/read-later', { params }),
  addToReadLater: (id, review_date) => api.post(`/links/${id}/read-later`, { review_date }),
  removeFromReadLater: (id) => api.delete(`/links/${id}/read-later`),
  updateReviewStatus: (id, review_status) => api.put(`/links/${id}/review-status`, { review_status }),
}

// Categories API
export const categoriesApi = {
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
}

// Tags API
export const tagsApi = {
  getTags: () => api.get('/categories/tags'),
}

// Import API
export const importApi = {
  importBookmarks: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import/bookmarks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Health Check API
export const healthCheckApi = {
  checkAll: () => api.post('/health-check/all', {}, { timeout: 600000 }),
  getDeadLinks: () => api.get('/health-check/dead'),
}

export default api
