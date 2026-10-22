import { AppstoreOutlined, CheckSquareOutlined, LogoutOutlined, MenuOutlined, ProjectOutlined } from '@ant-design/icons'
import { Avatar, Button, Drawer, Grid, Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navigation = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: '工作台' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: '我的任务' },
  { key: '/board', icon: <ProjectOutlined />, label: '任务看板' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={navigation}
      onClick={({ key }) => {
        navigate(key)
        setMenuOpen(false)
      }}
    />
  )

  return (
    <Layout className="app-shell">
      {screens.md ? (
        <Layout.Sider width={242} theme="light" className="app-sidebar">
          <div className="brand"><span className="brand-mark">T</span><span>TaskFlow</span></div>
          <div className="nav-caption">工作空间</div>
          {menu}
          <div className="sidebar-foot">专注当下，稳步推进。</div>
        </Layout.Sider>
      ) : (
        <Drawer title="TaskFlow" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} width={260}>
          {menu}
        </Drawer>
      )}
      <Layout>
        <Layout.Header className="app-header">
          {!screens.md && <Button type="text" icon={<MenuOutlined />} onClick={() => setMenuOpen(true)} aria-label="打开导航" />}
          <Typography.Text className="header-kicker">个人工作空间 / TaskFlow</Typography.Text>
          <div className="header-user">
            <Avatar className="user-avatar">{user?.username.slice(0, 1).toUpperCase()}</Avatar>
            <span className="user-name">{user?.username}</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login') }}>退出</Button>
          </div>
        </Layout.Header>
        <Layout.Content className="app-content"><Outlet /></Layout.Content>
      </Layout>
    </Layout>
  )
}
