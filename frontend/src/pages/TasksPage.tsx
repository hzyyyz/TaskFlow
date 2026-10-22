import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App as AntdApp, Button, Empty, Pagination, Popconfirm, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useEffect, useState } from 'react'
import { deleteTask, listTasks } from '../api/tasks'
import { errorMessage } from '../api/client'
import { TaskForm } from '../components/TaskForm'
import { localDate, priorityLabels, statusColors, statusLabels } from '../components/taskView'
import type { Task, TaskPage, TaskPriority, TaskStatus } from '../types/api'

export function TasksPage() {
  const { message } = AntdApp.useApp()
  const [result, setResult] = useState<TaskPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [status, setStatus] = useState<TaskStatus | undefined>()
  const [priority, setPriority] = useState<TaskPriority | undefined>()
  const [refresh, setRefresh] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    listTasks({ page, page_size: pageSize, status, priority }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult(data) })
      .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure, '任务加载失败')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, pageSize, status, priority, refresh])

  const remove = async (task: Task) => {
    try {
      await deleteTask(task.id)
      message.success('任务已删除')
      if (result?.items.length === 1 && page > 1) setPage(page - 1)
      else setRefresh((value) => value + 1)
    } catch (failure) {
      message.error(errorMessage(failure, '删除任务失败'))
      setRefresh((value) => value + 1)
    }
  }

  const columns: TableColumnsType<Task> = [
    { title: '任务', dataIndex: 'title', key: 'title', render: (value: string, task) => <div className="task-title-cell"><strong>{value}</strong>{task.description && <small>{task.description}</small>}</div> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 120, render: (value: TaskStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 100, render: (value: TaskPriority) => priorityLabels[value] },
    { title: '截止时间', dataIndex: 'due_date', key: 'due_date', width: 190, render: (value: string | null) => localDate(value) },
    { title: '操作', key: 'actions', width: 148, render: (_, task) => <div className="row-actions"><Button type="text" icon={<EditOutlined />} aria-label={`编辑 ${task.title}`} onClick={() => { setEditing(task); setFormOpen(true) }} /><Popconfirm title="删除任务" description={`确定删除“${task.title}”吗？`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(task)}><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${task.title}`} /></Popconfirm></div> },
  ]

  return (
    <div className="page-container">
      <div className="page-title-row"><div><span className="eyebrow">TASKS</span><Typography.Title level={2}>我的任务</Typography.Title><p className="page-subtitle">按状态和优先级筛选，只查看属于你的任务。</p></div><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true) }}>新建任务</Button></div>
      <div className="filters-row"><Select aria-label="状态筛选" placeholder="所有状态" allowClear value={status} style={{ minWidth: 160 }} onChange={(value) => { setStatus(value); setPage(1) }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /><Select aria-label="优先级筛选" placeholder="所有优先级" allowClear value={priority} style={{ minWidth: 160 }} onChange={(value) => { setPriority(value); setPage(1) }} options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} /><span className="results-count">共 {result?.total ?? 0} 项任务</span></div>
      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => setRefresh((value) => value + 1)}>重试</Button>} className="page-alert" />}
      <div className="table-surface"><Table<Task> rowKey="id" columns={columns} dataSource={result?.items ?? []} loading={loading} pagination={false} scroll={{ x: 760 }} locale={{ emptyText: <Empty description="暂无符合条件的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} /></div>
      {(result?.total ?? 0) > 0 && <div className="pagination-row"><Pagination current={page} pageSize={pageSize} total={result?.total ?? 0} showSizeChanger pageSizeOptions={[10, 20, 50]} onChange={(nextPage, nextSize) => { setPage(nextSize !== pageSize ? 1 : nextPage); setPageSize(nextSize) }} showTotal={(total) => `共 ${total} 项`} /></div>}
      <TaskForm open={formOpen} task={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); message.success(editing ? '任务已更新' : '任务已创建'); setRefresh((value) => value + 1) }} />
    </div>
  )
}
