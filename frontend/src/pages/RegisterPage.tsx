import { Alert, Button, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { errorMessage } from '../api/client'

interface RegisterValues { username: string; email: string; password: string }

export function RegisterPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (values: RegisterValues) => {
    setSubmitting(true)
    setError('')
    try {
      await registerUser({ ...values, username: values.username.trim(), email: values.email.trim() })
      navigate('/login', { replace: true })
    } catch (failure) {
      setError(errorMessage(failure, '注册失败，请稍后重试'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <div className="brand auth-brand"><span className="brand-mark">T</span><span>TaskFlow</span></div>
        <div className="auth-intro"><span className="eyebrow">GET STARTED</span><Typography.Title level={2}>创建你的账号</Typography.Title><p>一个清晰的工作空间，从这里开始。</p></div>
        {error && <Alert type="error" showIcon message={error} className="form-alert" />}
        <Form<RegisterValues> layout="vertical" onFinish={submit} requiredMark={false} size="large">
          <Form.Item label="用户名" name="username" rules={[{ required: true, whitespace: true, message: '请输入用户名' }, { max: 50, message: '最多 50 个字符' }]}><Input autoComplete="username" placeholder="输入用户名" /></Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }, { max: 255, message: '最多 255 个字符' }]}><Input autoComplete="email" placeholder="name@example.com" /></Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '至少 8 个字符' }, { max: 128, message: '最多 128 个字符' }]}><Input.Password autoComplete="new-password" placeholder="至少 8 个字符" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>创建账号</Button>
        </Form>
        <p className="auth-switch">已有账号？<Link to="/login">返回登录</Link></p>
      </div>
      <aside className="auth-aside"><div><span className="eyebrow">START SIMPLE</span><h2>少一点杂乱，<br />多一点进展。</h2><p>用任务列表与看板，整理每一天的重点。</p></div><div className="auth-aside-lines" /></aside>
    </main>
  )
}
