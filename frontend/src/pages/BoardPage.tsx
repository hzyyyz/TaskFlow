import { ReloadOutlined } from '@ant-design/icons'
import { Alert, App as AntdApp, Button, Empty, Select, Spin, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { loadBoardTasks } from '../api/taskData'
import { errorMessage } from '../api/client'
import { listTasks, updateTask } from '../api/tasks'
import { localDate, priorityLabels, statusLabels } from '../components/taskView'
import type { TaskStatus } from '../types/api'

type BoardData = Awaited<ReturnType<typeof loadBoardTasks>>
const statuses: TaskStatus[] = ['todo', 'doing', 'done']

export function BoardPage() {
  const { message } = AntdApp.useApp()
  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [movingId, setMovingId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    loadBoardTasks((query) => listTasks(query, controller.signal))
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure, '看板加载失败')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])

  const move = async (id: number, status: TaskStatus) => {
    setMovingId(id)
    try {
      await updateTask(id, { status })
      message.success('任务状态已更新')
      setRefresh((value) => value + 1)
    } catch (failure) {
      message.error(errorMessage(failure, '状态更新失败'))
      setRefresh((value) => value + 1)
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-title-row"><div><span className="eyebrow">KANBAN</span><Typography.Title level={2}>任务看板</Typography.Title><p className="page-subtitle">按状态查看任务，通过菜单推进下一步。</p></div><Button icon={<ReloadOutlined />} onClick={() => setRefresh((value) => value + 1)}>刷新</Button></div>
      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => setRefresh((value) => value + 1)}>重试</Button>} className="page-alert" />}
      {data && !data.complete && <Alert type="warning" showIcon message={`当前展示 ${data.items.length} / ${data.total} 项任务。看板最多加载 1000 项，请在“我的任务”中使用分页查看其余任务。`} className="page-alert" />}
      {loading && !data ? <div className="content-loading"><Spin /></div> : <div className="board-grid">
        {statuses.map((status) => {
          const items = data?.items.filter((task) => task.status === status) ?? []
          return <section key={status} className="board-column"><div className="board-column-heading"><span className={`board-status-dot status-${status}`} /><strong>{statusLabels[status]}</strong><span className="board-count">{items.length}</span></div><div className="board-column-content">{items.length ? items.map((task) => <article className="board-card" key={task.id}><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<div className="board-meta"><Tag>{priorityLabels[task.priority]}优先级</Tag><small>{task.due_date ? `截止 ${localDate(task.due_date)}` : '无截止时间'}</small></div><Select aria-label={`修改 ${task.title} 状态`} size="small" value={task.status} loading={movingId === task.id} disabled={movingId !== null} options={statuses.map((value) => ({ value, label: statusLabels[value] }))} onChange={(value) => move(task.id, value)} className="board-status-select" /></article>) : <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div></section>
        })}
      </div>}
    </div>
  )
}
