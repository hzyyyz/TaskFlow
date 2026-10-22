# TaskFlow

TaskFlow 是一个多用户任务管理 MVP，包含 FastAPI 后端与 React 前端。支持用户名注册登录、JWT 鉴权、按用户隔离的任务 CRUD，以及状态/优先级筛选、分页、工作台和看板。

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
frontend/       Vite + React + TypeScript 前端
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

## 前端启动与联调

Windows 本机首次按上文准备 Python、Node.js、`.env` 和数据库，并在 `frontend/` 执行一次 `npm install`、复制 `.env.example` 为 `.env.local`。此后可在项目根目录**双击 `start-taskflow.cmd`**：脚本启动本机 MySQL、执行迁移、在两个窗口启动后端与前端，并在就绪后尝试打开 `http://localhost:5173`；若系统阻止自动打开，窗口会显示访问地址。关闭服务时分别在后端和前端窗口按 `Ctrl+C`；MySQL 可留在后台供下次使用。若已有服务在 8000/5173 端口，启动器会复用它们；启动失败时查看窗口中的提示。

另开终端，在项目根目录运行：

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

打开 `http://localhost:5173`，注册账号后登录。前端需要已启动的后端与已迁移的数据库；默认 `VITE_API_BASE_URL=http://localhost:8000`，若后端地址不同，在 `frontend/.env.local` 中修改后重启 Vite。构建与检查使用 `npm run build`、`npm run lint`、`npm run test`。

后端默认只允许 `http://localhost:5173` 作为浏览器跨域来源。若使用其他前端 Origin，在启动后端的终端设置 `FRONTEND_ORIGIN` 为完整 Origin，例如 PowerShell 的 `$env:FRONTEND_ORIGIN='http://localhost:5174'`，再启动 Uvicorn；前端的 API 地址仍由 `VITE_API_BASE_URL` 控制。不要把 `FRONTEND_ORIGIN` 设置为 `*`。

首版前端把 JWT 存在 `localStorage`，因此页面若发生 XSS，Token 可能被读取。只在可信环境使用；后续可改为由服务端签发 HttpOnly Cookie，并配套 CSRF 防护。当前没有刷新令牌，过期后需要重新登录。前端验收见 [FRONTEND_ACCEPTANCE.md](docs/agent/FRONTEND_ACCEPTANCE.md)。

## Docker Compose 部署

安装 Docker Engine 与 Compose 插件后，在项目根目录准备 `.env`。如果此前只用于本机开发，请保留原有 `DATABASE_URL`，并参照 `.env.example` 增加 `MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`。两个密码都应使用不同的随机长字符串；`JWT_SECRET_KEY` 也需是随机密钥。`.env` 被 Git 忽略，不要将真实值提交或粘贴到公开日志。Docker 后端会自行构造指向 `db:3306` 的连接串，不使用本机 `127.0.0.1:3307` 的 `DATABASE_URL`。若 MySQL 密码包含 URL 保留字符，需对用于连接串的密码做 URL 编码；建议生成仅含字母、数字、`-`、`_` 的密码。

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

默认只在本机 `http://127.0.0.1:8080` 发布前端。`FRONTEND_BIND_IP` 和 `FRONTEND_PORT` 可在 `.env` 中调整；浏览器通过同源 `/api/v1/...` 访问 Nginx 代理的后端。后端和数据库没有宿主机端口映射。MySQL 健康后，后端先执行 `python -m alembic upgrade head`，成功才启动 Uvicorn；前端等待后端健康。首次数据库初始化可能需要一些时间。可检查首页、`/tasks` 深链接和 `/health`：

```powershell
Invoke-WebRequest http://127.0.0.1:8080/ -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/tasks -UseBasicParsing
Invoke-RestMethod http://127.0.0.1:8080/health
docker compose exec backend python -m alembic current
```

查看状态与故障日志：

```powershell
docker compose ps
docker compose logs --tail=100 db backend frontend
```

若数据库不健康，先看 `db` 日志与 `.env` 中的 MySQL 配置；MySQL 镜像的初始化变量只在空数据卷首次启动时生效，之后仅修改 `.env` 密码不会修改已有数据库账号。若后端未健康，检查迁移日志；若页面能打开但接口失败，检查 Nginx `/api/` 代理和后端状态。修改前端或后端代码后用 `docker compose up -d --build` 重建。更新前先备份数据库；下面的 PowerShell 命令将备份写入被 Git 忽略的 `backups/`：

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" --single-transaction "$MYSQL_DATABASE"' | Set-Content -Encoding utf8 backups/taskflow.sql
```

停机用 `docker compose down`，命名卷仍保留。需要回滚时先保存数据库备份，再用之前的代码版本重建；如果迁移改变了表结构，旧代码可能需要配套恢复数据库。**不要运行 `docker compose down -v` 清理数据**，它会删除数据库命名卷。公开部署前还需配置 HTTPS/反向代理，限制可访问范围，妥善管理密钥并安排定期备份。

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
