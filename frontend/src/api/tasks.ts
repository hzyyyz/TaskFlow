import { api } from './client'
import type { Task, TaskInput, TaskPage, TaskQuery } from '../types/api'

export async function listTasks(query: TaskQuery, signal?: AbortSignal): Promise<TaskPage> {
  const response = await api.get<TaskPage>('/api/v1/tasks', { params: query, signal })
  return response.data
}

export async function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  const response = await api.get<Task>(`/api/v1/tasks/${id}`, { signal })
  return response.data
}

export async function createTask(input: TaskInput): Promise<Task> {
  const response = await api.post<Task>('/api/v1/tasks', input)
  return response.data
}

export async function updateTask(id: number, input: Partial<TaskInput>): Promise<Task> {
  const response = await api.patch<Task>(`/api/v1/tasks/${id}`, input)
  return response.data
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/api/v1/tasks/${id}`)
}
