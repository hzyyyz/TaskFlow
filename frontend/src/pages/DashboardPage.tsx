import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, List, Spin, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadDashboardData } from '../api/taskData'
import { errorMessage } from '../api/client'
import { listTasks } from '../api/tasks'
import { useAuth } from '../auth/AuthContext'
import { localDate, statusColors, statusLabels } from '../components/taskView'

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    loadDashboardData((query) => listTasks(query, controller.signal))
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure, '工作台加载失败')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])

  return (
    <div className="page-container">
      <div className="page-title-row">
        <div><span className="eyebrow">OVERVIEW</span><Typography.Title level={2}>你好，{user?.username}</Typography.Title><p className="page-subtitle">看看当前的任务进展，从重要的事情开始。</p></div>
        <Button icon={<ReloadOutlined />} onClick={() => setRefresh((value) => value + 1)}>刷新</Button>
      </div>
      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => setRefresh((value) => value + 1)}>重试</Button>} className="page-alert" />}
      {loading && !data ? <div className="content-loading"><Spin /></div> : data && <>
        {!data.countsMatch && <Alert type="warning" showIcon message="任务总数与状态合计暂时不一致，可能有任务正在变动；以下分别显示接口返回值。" className="page-alert" />}
        <div className="stats-grid">
          {([
            ['全部任务', data.counts.all, 'all'],
            ['待办', data.counts.todo, 'todo'],
            ['进行中', data.counts.doing, 'doing'],
            ['已完成', data.counts.done, 'done'],
          ] as const).map(([label, count, kind]) => <Card key={kind} className={`stat-card stat-${kind}`}><span>{label}</span><strong>{count}</strong><small>来自任务接口的总数</small></Card>)}
        </div>
        <Card className="surface-card" title="最近任务" extra={<Link to="/tasks">查看全部 <ArrowRightOutlined /></Link>}>
          {data.recent.length ? <List dataSource={data.recent} renderItem={(task) => <List.Item className="recent-item"><div className="recent-main"><span className="task-dot" /><div><strong>{task.title}</strong><small>创建于 {localDate(task.created_at)}</small></div></div><Tag color={statusColors[task.status]}>{statusLabels[task.status]}</Tag></List.Item>} /> : <Empty description="还没有任务，去创建第一项吧" image={Empty.PRESENTED_IMAGE_SIMPLE}><Link to="/tasks"><Button type="primary">前往我的任务</Button></Link></Empty>}
        </Card>
      </>}
    </div>
  )
}
