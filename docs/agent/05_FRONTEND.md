# 阶段五：React Web 前端与后端联调（预计 2～3 天）

## 开始前（强制）
1. 阅读 `docs/agent/00_PROJECT_RULES.md`、`04_TEST_AND_DELIVERY.md`、`docs/agent/PROGRESS.md`、`docs/agent/ACCEPTANCE.md`（若存在）。
2. 检查实际 FastAPI 路由、OpenAPI schema、Pydantic schemas、鉴权和分页响应。不可凭猜测生成字段。
3. 若阶段四未完成或关键 API 不可用，先报告阻塞并停止，不要伪造 Mock 数据绕过。
4. 先输出文件清单、接口映射表和开发计划，再实施。仅开发阶段五。

## 目标与技术栈
在根目录新增 `frontend/`，构建可以演示完整注册→登录→任务管理流程的前端，视觉参考 Linear 的简洁 SaaS 风格，组件使用 Ant Design。
- React + Vite + TypeScript
- Ant Design
- Axios
- React Router
- 不使用 Next.js、Redux、Zustand、ECharts、拖拽库或复杂状态管理；不新增独立服务或数据库。
- 前端通过 Vite 环境变量 `VITE_API_BASE_URL` 访问后端，例如 `http://localhost:8000`；禁止硬编码正式地址。

## 严格遵守的 API 契约
| 功能 | 接口 | 关键约定 |
|---|---|---|
| 注册 | POST `/api/v1/auth/register` | JSON：username、email、password；201 |
| 登录 | POST `/api/v1/auth/login` | `application/x-www-form-urlencoded`：username、password；响应 access_token、token_type |
| 当前用户 | GET `/api/v1/auth/me` | Bearer JWT |
| 创建任务 | POST `/api/v1/tasks` | 201；owner_id 不允许由前端指定 |
| 列表 | GET `/api/v1/tasks` | page 默认1，page_size 默认10最大100；status/priority 可选；响应 `{items,total,page,page_size}` |
| 详情 | GET `/api/v1/tasks/{task_id}` | 200；越权或不存在为404 |
| 更新 | PATCH `/api/v1/tasks/{task_id}` | 部分更新；title/description/status/priority/due_date |
| 删除 | DELETE `/api/v1/tasks/{task_id}` | 204 无响应体 |

状态枚举 `todo` / `doing` / `done`；优先级 `low` / `medium` / `high`。前端展示中文标签，提交原始枚举值。日期按后端 UTC 契约收发，显示时转换用户本地时间。不要假定有 `/stats`、`/dashboard`、搜索、刷新令牌、任务分配或批量更新接口。

## 页面和交互
1. **登录/注册**：表单校验、提交 loading、后端错误提示、注册成功跳转登录；登录使用表单编码而非 JSON。
2. **工作台 Dashboard**：展示任务总数、todo/doing/done 数量及最近任务；统计必须真实且准确。可分别请求 `GET /tasks?page=1&page_size=1` 及各状态过滤的 `total`；最近任务从正常分页接口读取。不得以第一页 items.length 代表总数。
3. **我的任务**：列表、分页、状态和优先级筛选；新建、编辑、删除（确认框）；表单只提交后端允许字段；操作成功刷新相关数据。
4. **看板 Kanban**：三列 todo/doing/done；用下拉菜单或按钮触发 PATCH status；支持分页加载全部当前用户任务或明确显示仅部分数据，禁止静默丢任务；首版不做拖拽。
5. **整体布局**：响应式侧边导航、顶部用户信息和退出入口；桌面优先，移动端可正常使用。

## 工程实现约束
- 目录建议：`frontend/src/{api,components,layouts,pages,routes,types}`，按需创建，不做过度分层。
- Axios 实例统一 baseURL、超时、Authorization 请求拦截器、401 响应处理；防止登录接口的401造成循环跳转。
- 实现路由守卫；刷新后通过已保存 Token 调用 `/auth/me` 校验身份。MVP 可使用 localStorage 保存 Token，但 README 必须说明 XSS 风险及未来 HttpOnly Cookie 改造方向；不要把 Token 打进日志。
- 必须覆盖加载、空列表、网络错误、422 校验错误、409 注册冲突、401 会话失效、404 任务不存在等反馈。
- 避免重复请求和竞态导致旧筛选结果覆盖新结果；组件卸载时取消过时请求或采用等效措施。
- 前端不得通过 URL owner_id 伪造用户身份；权限由后端保障。
- 如跨域被浏览器阻止，可在后端配置精确允许的本地开发 Origin（如 http://localhost:5173），不得在携带凭证场景下无约束放开全部源。记录最小改动并跑后端回归测试。
- 不破坏 01～04 已实现的接口与数据库迁移；若确需改后端，先说明必要性和影响，优先非破坏性修改。

## 实施顺序
A. 审查真实 API 与阶段四验收结果，给出接口映射。
B. 初始化 Vite/React/TS/Ant Design/Router/Axios，完成布局和环境配置。
C. 完成注册登录、路由保护与 API 封装。
D. 完成任务列表 CRUD、筛选分页与表单校验。
E. 完成 Dashboard 真实统计和 Kanban 状态更新。
F. 完成前后端联调、构建、README 和验收。

## 验收标准
- `npm install`、`npm run dev`、`npm run build`（或项目实际包管理器等效命令）可执行；记录真实结果。
- 真实后端可用时：注册→登录→获取当前用户→创建→筛选分页→编辑→看板修改状态→删除→退出流程可演示。
- 两个不同账号登录只看到各自任务；后端跨用户权限测试仍通过。
- Dashboard 统计和分页来自真实接口；无硬编码假数据。
- 401、404、409、422、网络断开均有合理反馈；无效 Token 能退出并返回登录。
- 前端适配桌面与移动屏幕；`frontend/.env.example`、启动说明齐全。
- 后端 `pytest -q` 回归测试结果如实记录；没有可用后端时标记联调未验证，不声称通过。

## 交接和停止条件
- 更新 `docs/agent/PROGRESS.md`：阶段五文件改动、启动命令、前后端测试结果、未验证项、遗留问题。
- 更新 README 增加前端启动和联调说明；生成 `docs/agent/FRONTEND_ACCEPTANCE.md` 记录验收证据。
- 不进入下一阶段，不擅自增加团队协作、Agent、Redis、拖拽看板。
