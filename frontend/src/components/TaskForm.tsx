import { Alert, Form, Input, Modal, Select } from 'antd'
import { useEffect, useState } from 'react'
import { createTask, updateTask } from '../api/tasks'
import { errorMessage } from '../api/client'
import type { Task, TaskPriority, TaskStatus } from '../types/api'
import { priorityLabels, statusLabels, toLocalDateInput } from './taskView'

interface TaskFormValues {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
}

interface Props {
  open: boolean
  task: Task | null
  onCancel: () => void
  onSaved: () => void
}

export function TaskForm({ open, task, onCancel, onSaved }: Props) {
  const [form] = Form.useForm<TaskFormValues>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    form.setFieldsValue({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      priority: task?.priority ?? 'medium',
      due_date: toLocalDateInput(task?.due_date ?? null),
    })
  }, [open, task, form])

  const submit = async (values: TaskFormValues) => {
    setSaving(true)
    setError('')
    const input = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      status: values.status,
      priority: values.priority,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
    }
    try {
      if (task) await updateTask(task.id, input)
      else await createTask(input)
      onSaved()
    } catch (failure) {
      setError(errorMessage(failure, '保存任务失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={task ? '编辑任务' : '新建任务'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="保存任务"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      {error && <Alert type="error" message={error} showIcon className="form-alert" />}
      <Form<TaskFormValues> form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item label="任务标题" name="title" rules={[{ required: true, whitespace: true, message: '请输入任务标题' }, { max: 100, message: '最多 100 个字符' }]}><Input placeholder="需要完成什么？" maxLength={100} /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea rows={3} placeholder="补充一点上下文（可选）" /></Form.Item>
        <div className="form-row">
          <Form.Item label="状态" name="status"><Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item label="优先级" name="priority"><Select options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        </div>
        <Form.Item label="截止时间" name="due_date" extra="按你的本地时间输入；保存时转换为 UTC"><Input type="datetime-local" /></Form.Item>
      </Form>
    </Modal>
  )
}
