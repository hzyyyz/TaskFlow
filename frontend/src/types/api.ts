export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  owner_id: number
  created_at: string
  updated_at: string
}

export interface TaskPage {
  items: Task[]
  total: number
  page: number
  page_size: number
}

export interface TaskQuery {
  page: number
  page_size: number
  status?: TaskStatus
  priority?: TaskPriority
}

export interface TaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
}
