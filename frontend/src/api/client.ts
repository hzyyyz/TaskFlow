import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'taskflow.access_token'
export const UNAUTHORIZED_EVENT = 'taskflow:unauthorized'
const AUTH_NOTICE_KEY = 'taskflow.auth_notice'

export function takeAuthNotice(): string {
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY) || ''
  sessionStorage.removeItem(AUTH_NOTICE_KEY)
  return notice
}

export function setAuthNotice(message: string): void {
  sessionStorage.setItem(AUTH_NOTICE_KEY, message)
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'),
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !config.url?.endsWith('/auth/login') && !config.url?.endsWith('/auth/register')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/login')) {
      setAuthNotice('登录已过期，请重新登录')
      tokenStore.clear()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!axios.isAxiosError(error)) return fallback
  if (!error.response) return '无法连接服务器，请检查网络或后端服务'
  const { status, data } = error.response
  if (status === 401) return '用户名或密码错误，或登录已过期'
  if (status === 404) return '任务不存在或无权访问'
  if (status === 409) return '用户名或邮箱已被注册'
  if (status === 422) {
    const detail = data?.detail
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => String(item.msg || '输入不符合要求'))
      return `输入不符合要求：${messages.join('；')}`
    }
    return '输入不符合要求，请检查填写内容'
  }
  return fallback
}
