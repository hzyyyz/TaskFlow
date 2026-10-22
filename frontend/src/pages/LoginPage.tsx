import { ArrowRightOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, takeAuthNotice } from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface LoginValues { username: string; password: string }

export function LoginPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(takeAuthNotice)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async ({ username, password }: LoginValues) => {
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (failure) {
      setError(errorMessage(failure, '登录失败，请稍后重试'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <div className="brand auth-brand"><span className="brand-mark">T</span><span>TaskFlow</span></div>
        <div className="auth-intro"><span className="eyebrow">WELCOME BACK</span><Typography.Title level={2}>欢迎回来</Typography.Title><p>登录后继续管理你的任务和进度。</p></div>
        {error && <Alert type="error" showIcon message={error} className="form-alert" />}
        <Form<LoginValues> layout="vertical" onFinish={submit} requiredMark={false} size="large">
          <Form.Item label="用户名" name="username" rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}><Input autoComplete="username" placeholder="输入用户名" /></Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password autoComplete="current-password" placeholder="输入密码" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>登录 <ArrowRightOutlined /></Button>
        </Form>
        <p className="auth-switch">还没有账号？<Link to="/register">创建账号</Link></p>
      </div>
      <aside className="auth-aside"><div><span className="eyebrow">A CALMER WAY TO WORK</span><h2>让每一件事，<br />都有清晰的下一步。</h2><p>从待办到完成，在一个简单的空间里掌握自己的节奏。</p></div><div className="auth-aside-lines" /></aside>
    </main>
  )
}
