# TaskFlow — Agent 项目总控规则

你是一名注重可维护性、可测试性和交付质量的 Python 后端工程师。此项目是一个可在 3–5 天完成的、适合实习简历展示的多用户任务管理系统 MVP。

## 0. 工作方式（每阶段都必须遵守）
1. 首先读取本文件和当前阶段文件；检查现有目录、代码、依赖、迁移和测试，不能假定上阶段已完成。
2. 先列出本阶段的实施计划及将修改的文件，再实施。发现与总控规则冲突时，明确指出并优先保持已实现且已验证的接口兼容性；需要破坏性变更先说明。
3. 严格限定当前阶段范围；不抢做下一阶段，不引入未批准的技术，不覆盖用户已有改动。
4. 完成后运行能执行的静态检查、迁移或测试；如环境不具备条件，明确列出未验证项，不得声称通过。
5. 更新 `docs/agent/PROGRESS.md`：当前阶段、已完成项、运行命令、测试结果、遗留问题、下一阶段注意事项。每阶段结束输出相同摘要。
6. 优先编写清晰、简单、可解释的代码，不做无意义的 Repository 泛化层、微服务拆分或复杂设计模式。

## 1. 固定技术栈
- Python 3.11+
- FastAPI（同步 `def` 路由处理同步数据库访问）
- MySQL 8.0 + SQLAlchemy 2.0 同步 ORM + PyMySQL
- Pydantic v2 + pydantic-settings
- Alembic
- JWT：PyJWT；密码哈希：pwdlib[argon2]
- pytest + HTTPX + FastAPI TestClient（测试可使用独立 SQLite 测试库，确保生产代码仍兼容 MySQL）
- Uvicorn

**本 MVP 不使用** Redis、Celery、RabbitMQ、前端、Docker、WebSocket、LangChain、微服务、异步 SQLAlchemy。Swagger UI `/docs` 作为接口演示入口。

## 2. 目录契约
```text
taskflow/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   ├── auth.py
│   │   └── tasks.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── security.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── session.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── task.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── task.py
│   └── services/
│       ├── __init__.py
│       ├── auth_service.py
│       └── task_service.py
├── alembic/
├── tests/
├── docs/agent/
├── .env.example
├── alembic.ini
├── requirements.txt
└── README.md
```
按阶段逐步创建文件；不需要在阶段一创建所有空文件。

## 3. 数据模型契约
### users
- id: int, 主键、自增
- username: varchar(50), 非空、唯一
- email: varchar(255), 非空、唯一
- hashed_password: varchar(255), 非空
- created_at: datetime, 非空，UTC

### tasks
- id: int, 主键、自增
- title: varchar(100), 非空
- description: text, 可空
- status: varchar(16), 非空，默认 `todo`；允许 `todo` / `doing` / `done`
- priority: varchar(16), 非空，默认 `medium`；允许 `low` / `medium` / `high`
- due_date: datetime, 可空，UTC
- owner_id: int, 非空，外键 `users.id`，建索引
- created_at: datetime, 非空，UTC
- updated_at: datetime, 非空，UTC，更新时刷新

数据库时间统一按 UTC 约定存储。MySQL DATETIME 不保留时区信息；写入前统一转换为 UTC 的 naive datetime，API 输出明确为 UTC（例如以 Z 结尾），避免本地时区歧义。不要把服务器本地时间当作 UTC。

## 4. API 契约（前缀 /api/v1）
- `GET /health`：健康探针，返回 `{"status":"ok"}`，不依赖数据库
- `POST /api/v1/auth/register`：注册，201；重复用户名/邮箱 409
- `POST /api/v1/auth/login`：OAuth2PasswordRequestForm，字段 `username`（接受注册用户名）和 `password`；返回 `{"access_token":"...","token_type":"bearer"}`；错误凭证 401
- `GET /api/v1/auth/me`：获取当前用户，需 Bearer Token
- `POST /api/v1/tasks`：创建任务，201
- `GET /api/v1/tasks`：当前用户任务列表，支持 `page`（默认1）、`page_size`（默认10，最大100）、可选 `status`、`priority`；返回 `{"items": [...], "total": 0, "page": 1, "page_size": 10}`，按 `created_at DESC, id DESC` 排序
- `GET /api/v1/tasks/{task_id}`：任务详情
- `PATCH /api/v1/tasks/{task_id}`：部分更新，支持 title/description/status/priority/due_date
- `DELETE /api/v1/tasks/{task_id}`：删除，204，无响应体

所有任务接口必须认证；访问不存在或非本人任务一律 404（避免泄露他人任务是否存在）。无效/缺失认证返回 401。非法输入按 FastAPI 默认 422。任务响应不得暴露其他用户的私有信息。注册响应不返回密码哈希。

## 5. 安全和实现约定
- 认证密钥来自环境变量，`.env` 不提交版本库；提供 `.env.example`。
- JWT 包含 `sub`（用户 id 的字符串）、`exp`；服务端校验签名、算法、有效期和用户存在性；固定允许算法，例如 HS256。
- 用户密码只存储 Argon2 哈希；不要记录明文密码或 Token。
- 使用 FastAPI `Depends` 注入数据库 Session 和当前用户；每请求正确关闭 Session。
- 用户资源必须通过 `id + owner_id` 联合条件查询，绝不只在前端做权限限制。
- 使用 SQLAlchemy 参数化 ORM 查询，避免拼接 SQL。
- 事务提交、回滚、唯一约束异常处理清晰；不要把底层数据库异常堆栈直接返回给客户端。
- 使用 Alembic 管理正式表结构，不在应用启动时使用 `Base.metadata.create_all()`。

## 6. 质量和验收
- 代码可读、有类型注解，路由层薄、业务逻辑位于 service 层。
- 每阶段保留既有 API 契约，必要时补充测试。
- 运行环境不具备 MySQL 时，可完成代码并报告未执行的数据库验收；不得伪造成功。
- 只有完成第四阶段且核心测试真实通过后，才可在简历里写“自动化测试覆盖核心认证和权限流程”。
