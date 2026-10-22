import type { Task, TaskPage, TaskQuery, TaskStatus } from '../types/api'

type FetchPage = (query: TaskQuery) => Promise<TaskPage>

export async function loadDashboardData(fetchPage: FetchPage) {
  const statuses: TaskStatus[] = ['todo', 'doing', 'done']
  const [recentPage, ...statusPages] = await Promise.all([
    fetchPage({ page: 1, page_size: 5 }),
    ...statuses.map((status) => fetchPage({ page: 1, page_size: 1, status })),
  ])
  const counts = {
    all: recentPage.total,
    todo: statusPages[0].total,
    doing: statusPages[1].total,
    done: statusPages[2].total,
  }
  return {
    counts,
    countsMatch: counts.all === counts.todo + counts.doing + counts.done,
    recent: recentPage.items,
  }
}

export async function loadBoardTasks(fetchPage: FetchPage, limit = 1000) {
  const items: Task[] = []
  let total = 0
  let page = 1
  while (items.length < limit) {
    const response = await fetchPage({ page, page_size: Math.min(100, limit - items.length) })
    total = response.total
    items.push(...response.items)
    if (response.items.length === 0 || items.length >= total) break
    page += 1
  }
  return { items, total, complete: items.length >= total }
}
