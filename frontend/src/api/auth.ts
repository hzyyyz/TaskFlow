import { api } from './client'
import type { User } from '../types/api'

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const response = await api.post<User>('/api/v1/auth/register', input)
  return response.data
}

export async function loginUser(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username, password })
  const response = await api.post<{ access_token: string; token_type: string }>(
    '/api/v1/auth/login',
    body,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  return response.data.access_token
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const response = await api.get<User>('/api/v1/auth/me', { signal })
  return response.data
}
