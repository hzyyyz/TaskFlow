# 阶段三：任务 CRUD、权限隔离与筛选分页（预计 1–2 天）

## 开始前
完整阅读 `docs/agent/00_PROJECT_RULES.md`、`02_AUTH.md` 和 `docs/agent/PROGRESS.md`；检查已有代码及认证依赖。保留已实现 API 的行为。只实现本阶段。

## 目标
实现一个完整的多用户任务管理业务闭环，重点保证用户级资源权限隔离。

## 实现任务
1. `app/schemas/task.py`：定义 TaskCreate、TaskUpdate、TaskRead、TaskPage；枚举 status（todo/doing/done）、priority（low/medium/high）；title 长度 1–100；更新字段均可选，区分“未传”与“明确传 null”，不可将必填字段更新为 null。
2. `app/services/task_service.py`：实现任务创建、按当前用户查询列表/详情、局部更新、删除；所有读取、修改、删除必须在数据库查询条件中同时限定 `task_id` 和 `owner_id`。任务 owner_id 从认证上下文取得，禁止客户端指定或修改。
3. `app/api/tasks.py`：实现以下 API，全部依赖 `get_current_user`：
   - `POST /api/v1/tasks` → 201
   - `GET /api/v1/tasks` → 200，支持 page>=1、page_size 1–100（默认10）、可选 status/priority；返回 `{items,total,page,page_size}`，按 `created_at DESC,id DESC` 排序，total 为过滤后总数。
   - `GET /api/v1/tasks/{task_id}` → 200
   - `PATCH /api/v1/tasks/{task_id}` → 200
   - `DELETE /api/v1/tasks/{task_id}` → 204，空响应体
4. 使用 Pydantic 处理输入校验，非法状态/优先级/分页参数返回 422。任务不存在或非当前用户所有，统一返回 404。
5. 处理 UTC 时间输入输出，特别是 due_date 的时区规范化；更新任务时刷新 updated_at。
6. 补充最小任务测试：CRUD、列表分页、筛选、非法字段、未认证请求、跨用户详情/更新/删除全部返回 404、跨用户列表不泄露数据。
7. 如模型调整需要迁移，使用新增 Alembic revision，不改写已经应用过的历史迁移。

## 不做
不实现团队/项目空间、角色管理、任务分配、附件、通知、WebSocket、统计图、Redis、前端。

## 验收
- 两个用户分别注册登录，各自只能查看和操作自己的任务。
- 任务创建、详情、部分更新、删除均符合总控 API 契约。
- 状态/优先级筛选与分页返回正确 total；排序稳定。
- 无效请求 422；未认证 401；越权或不存在任务 404。
- 任务删除返回 204 且无响应体。
- 认证模块与健康检查回归测试仍通过。

## 阶段结束交接
更新 `docs/agent/PROGRESS.md`，记录已实现 API、真实测试结果、数据库迁移变化和已知问题。停止，不进入阶段四。
