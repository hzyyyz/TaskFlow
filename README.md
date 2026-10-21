# TaskFlow

TaskFlow 是一个多用户任务管理系统的 FastAPI 后端 MVP。支持用户名注册登录、JWT 鉴权、按用户隔离的任务 CRUD，以及状态/优先级筛选和分页。Swagger UI 可用于直接演示完整流程。

## 技术栈与结构

Python 3.11+、FastAPI（同步路由）、SQLAlchemy 2.0 同步 ORM、MySQL 8.0 + PyMySQL、Pydantic v2、Alembic、PyJWT、pwdlib Argon2、pytest + HTTPX。测试使用独立 SQLite 数据库。

```text
app/api/        HTTP 路由与认证依赖
app/core/       配置、密码哈希与 JWT
app/db/         ORM 基类、engine 与请求 Session
app/models/     User、Task 数据模型
app/schemas/    Pydantic 输入与响应模型
app/services/   注册认证与任务业务逻辑
alembic/        数据库迁移
tests/          隔离数据库的自动化测试
docs/agent/     阶段记录与验收资料
```

## 本地准备

安装 Python 3.11 或更新版本，然后在项目根目录执行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

在 macOS/Linux 上对应使用 `source .venv/bin/activate` 和 `cp .env.example .env`。在 `.env` 中填写真实的 MySQL 连接信息，并将 `JWT_SECRET_KEY` 替换为随机长字符串；`.env.example` 只包含占位值。

在 MySQL 8.0 中创建数据库和专用用户，例如：

```sql
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'taskflow'@'127.0.0.1' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON taskflow.* TO 'taskflow'@'127.0.0.1';
```

`DATABASE_URL` 的格式见 `.env.example`。若密码包含 `@`、`:`、`/` 等 URL 特殊字符，请先进行 URL 编码。`.env` 和其他 `.env.*` 文件已列入 `.gitignore`，`.env.example` 除外；不要提交真实密钥或数据库凭据。

## 迁移与启动

```powershell
alembic upgrade head
alembic current
uvicorn app.main:app --reload
```

打开 `http://127.0.0.1:8000/docs` 查看 Swagger UI；`GET http://127.0.0.1:8000/health` 返回 `{"status":"ok"}`。应用启动不会自动建表。

## 认证接口

- `POST /api/v1/auth/register`：JSON 请求，包含 `username`、`email`、`password`；密码至少 8 个字符。
- `POST /api/v1/auth/login`：表单请求，`username` 填注册用户名（不是邮箱），`password` 填密码；返回 Bearer Token。
- `GET /api/v1/auth/me`：请求头 `Authorization: Bearer <access_token>`，返回当前用户资料。

在 Swagger UI 中可用 **Authorize** 按钮输入用户名和密码。JWT 使用 HS256，包含字符串形式的用户 id (`sub`) 与到期时间 (`exp`)；有效期由 `ACCESS_TOKEN_EXPIRE_MINUTES` 配置。

## 任务接口

所有任务接口都需要 Bearer Token。任务归属取自当前登录用户，客户端不能指定 `owner_id`。

- `POST /api/v1/tasks`：创建任务，返回 201。
- `GET /api/v1/tasks`：返回当前用户的任务分页列表。`page` 默认 1，`page_size` 默认 10、最大 100；可选 `status` 和 `priority` 筛选。结果按创建时间和 id 倒序排列。
- `GET /api/v1/tasks/{task_id}`：查看任务。
- `PATCH /api/v1/tasks/{task_id}`：局部更新；`description` 和 `due_date` 可传 `null` 清空，`title`、`status`、`priority` 不可传 `null`。
- `DELETE /api/v1/tasks/{task_id}`：删除任务，返回 204。

访问不存在或其他用户的任务均返回 404。日期输入须带时区；数据库按 UTC naive DATETIME 存储，API 时间输出以 `Z` 表示 UTC。

## 演示顺序

迁移并启动应用后，可在 `/docs` 按“注册 → Authorize 登录 → 创建任务 → 查询 → 更新 → 删除”操作。以下 PowerShell 命令也可执行同一流程：

```powershell
$base = 'http://127.0.0.1:8000'
$newUser = @{ username = 'demo'; email = 'demo@example.com'; password = 'secret123' } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/auth/register" -Method Post -ContentType 'application/json' -Body $newUser
$login = Invoke-RestMethod "$base/api/v1/auth/login" -Method Post -ContentType 'application/x-www-form-urlencoded' -Body @{ username = 'demo'; password = 'secret123' }
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod "$base/api/v1/auth/me" -Headers $headers
$task = Invoke-RestMethod "$base/api/v1/tasks" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"title":"Demo task"}'
Invoke-RestMethod "$base/api/v1/tasks" -Headers $headers
Invoke-RestMethod "$base/api/v1/tasks/$($task.id)" -Headers $headers
Invoke-RestMethod "$base/api/v1/tasks/$($task.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body '{"status":"done"}'
Invoke-RestMethod "$base/api/v1/tasks/$($task.id)" -Method Delete -Headers $headers
```

## 测试与迁移核对

运行全部自动化测试：

```powershell
python -m pytest -q
```

测试通过 FastAPI `dependency_overrides` 使用临时 SQLite 库，不会连接 `.env` 指向的开发库。可用 `alembic current` 和 `alembic check` 核对已配置数据库的迁移状态；在空的专用 MySQL 库运行 `alembic upgrade head` 可验证正式迁移。应用启动不会自动建表。

## 已知限制与后续方向

- 当前没有 refresh token、邮件验证、团队空间或任务分配；邮箱只检查非空与长度，未做严格地址格式验证。
- 自动化测试使用 SQLite；另已在独立的本机 MySQL 8.0.46 实例验证迁移和完整接口链路。原有系统 MySQL80 服务未用于此次验收；本机实例和连接配置不会随仓库克隆。详见 [验收报告](docs/agent/ACCEPTANCE.md)。
- 可选 V2 方向：团队空间、Redis 缓存、Docker 部署、Agent 自然语言任务创建；这些均未实现。
