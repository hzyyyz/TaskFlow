import assert from 'node:assert/strict'
import test from 'node:test'

import { loadBoardTasks, loadDashboardData } from '../src/api/taskData.ts'

test('dashboard counts use API totals instead of returned item counts', async () => {
  const calls = []
  const fetchPage = async (params) => {
    calls.push(params)
    if (params.status) {
      return { items: [], total: { todo: 3, doing: 2, done: 1 }[params.status], page: 1, page_size: 1 }
    }
    return { items: [{ id: 9 }], total: 6, page: 1, page_size: params.page_size }
  }

  const result = await loadDashboardData(fetchPage)

  assert.deepEqual(result.counts, { all: 6, todo: 3, doing: 2, done: 1 })
  assert.equal(result.recent.length, 1)
  assert.equal(result.countsMatch, true)
  assert.equal(calls.length, 4)
})

test('board loads every page and reports an explicit limit', async () => {
  const fetchPage = async ({ page }) => ({
    items: Array.from({ length: page === 1 ? 100 : 50 }, (_, index) => ({ id: (page - 1) * 100 + index + 1 })),
    total: 150,
    page,
    page_size: 100,
  })

  const complete = await loadBoardTasks(fetchPage)
  assert.equal(complete.items.length, 150)
  assert.equal(complete.complete, true)

  const limited = await loadBoardTasks(fetchPage, 100)
  assert.equal(limited.items.length, 100)
  assert.equal(limited.total, 150)
  assert.equal(limited.complete, false)
})
