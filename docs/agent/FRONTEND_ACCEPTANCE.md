# 阶段五前端验收记录

初验日期：2026-10-21；补验日期：2026-10-22。工作目录：`F:\PythonProject\TaskFlow`。本记录只陈述实际执行或检查到的结果。

## 接口与实现

- 注册 `POST /api/v1/auth/register` 使用 JSON；登录 `POST /api/v1/auth/login` 使用表单编码；刷新页面时用 Bearer Token 请求 `GET /api/v1/auth/me`。
- 任务列表、创建、更新、删除分别调用既有 `/api/v1/tasks` 路由。任务归属由后端确定，前端不提交 `owner_id`。
- 工作台使用任务列表响应的 `total` 统计全部及三个状态，最近任务取第一页 5 项；看板逐页读取最多 1000 项，超过限制显示已加载数与总数。
- 后端仅增加本地前端 Origin 的 CORS 许可；没有修改路由、schema 或迁移。

## 实际执行

| 检查 | 结果 |
|---|---|
| `npm install --offline --cache .npm-cache` | 成功，125 个包，0 个已知漏洞；此前已从 npm 安装依赖并生成 lockfile |
| `npm run dev` | Vite 已启动；`GET http://localhost:5173/` 返回 200 |
| `npm run test` | 2 passed：工作台使用 `total`，看板分页与显式上限 |
| `npm run lint` | 退出码 0；5 条告警（4 条 effect 内同步 setState，1 条 Fast Refresh 导出） |
| `npm run build` | 成功；Vite 8.3.5，3169 个模块；最终主 JS 约 1161.01 kB、gzip 374.09 kB，产生超过 500 kB 的体积提示 |
| `python -m pytest -q` | 48 passed，0 failed；1 条第三方 Starlette/TestClient 弃用警告 |
| `ruff check app alembic tests` | All checks passed |
| `python -m alembic current` | 本机 MySQL 8.0.46：`0001_initial (head)` |
| `GET http://127.0.0.1:8000/health` | 200 |

## 真实后端联调

在本机独立 MySQL 测试实例、Uvicorn 和 Vite 服务运行时，通过浏览器完成：注册账号、登录、`/me` 获取当前用户、创建任务、编辑标题和状态、按状态筛选、看板改为完成、刷新后恢复会话、退出、再登录并删除任务。工作台从 0 项到 1 项及完成状态的计数与列表一致。第二个账号登录后工作台为 0 项，没有看到第一个账号的任务。测试账号保留在本机测试库，测试任务已删除。桌面布局已在浏览器观察。

后端自动化测试覆盖未认证 401、跨用户/不存在任务 404、注册冲突 409、非法输入 422、分页与隔离。前端的 Axios 错误映射对这些状态和网络断开提供中文提示；登录接口 401 不触发全局会话退出，其他 401 清除 Token 并提示重新登录。初验时这些错误提示路径仅经过代码检查和构建，随后按下节补充浏览器验收。

## 2026-10-22 补充浏览器验收

使用本机 Chrome 的隔离无头浏览器上下文与 Playwright Core（只安装在系统临时目录），在 390×844 视口连接真实 Vite、FastAPI 和 MySQL 服务：

- 注册与登录、移动导航抽屉进入任务页、创建任务和列表显示均通过；任务页截图目视检查，页面没有整体水平溢出，任务表格可单独横向滚动。
- 错误密码登录 401、重复注册 409、已被 API 删除的任务再次通过 UI 删除产生 404、失效 Token 刷新后返回登录页并显示会话过期提示，均通过真实后端与浏览器验证。
- 浏览器网络离线模拟后刷新工作台，显示断网提示；恢复网络后测试结束。
- 422 输入错误提示在浏览器中通过拦截一次任务创建请求、返回与后端格式一致的 422 响应验证；后端实际 422 响应仍由 Python 自动化测试覆盖。未将该模拟称为实库 422 联调。
- 补验时 `python -m pytest -q` 为 48 passed、1 条第三方弃用警告；`npm run test` 为 2 passed。

## 未验证项与限制

- 390×844 的移动浏览器视口与点击交互已验收；未在实体手机上做触控设备测试。
- 首版 Token 存在 `localStorage`；XSS 可读取 Token。README 已说明后续 HttpOnly Cookie 与 CSRF 防护方向。
- 看板超过 1000 项会明确提示仅显示部分任务；其余任务可在分页列表查看。
- lint 与构建提示如上，不影响此次测试和构建成功，但后续可优化。

阶段五止于前端交付；未加入团队协作、Agent、Redis 或拖拽看板。
