import type { TaskPriority, TaskStatus } from '../types/api'

export const statusLabels: Record<TaskStatus, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
}

export const priorityLabels: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const statusColors: Record<TaskStatus, string> = {
  todo: 'default',
  doing: 'processing',
  done: 'success',
}

export function localDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '未设置'
}

export function toLocalDateInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
