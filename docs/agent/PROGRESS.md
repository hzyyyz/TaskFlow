# TaskFlow 阶段进度

## 当前阶段

阶段四已完成；随后完成 GitHub 仓库交付。自动化测试和独立的本机 MySQL 8.0.46 实库迁移、接口链路均已通过；代码已推送到私有仓库 `hzyyyz/TaskFlow` 的 `main` 分支。验收细目见 [ACCEPTANCE.md](ACCEPTANCE.md)，技术说明见 [INTERVIEW_NOTES.md](INTERVIEW_NOTES.md)。

## GitHub 仓库交付

- 创建私有仓库 `https://github.com/hzyyyz/TaskFlow`，本地 `origin` 指向其 HTTPS 地址。
- 推送前 `python -m pytest -q`：47 passed、1 条第三方弃用警告；`git diff --cached --check`：退出码 0；首次提交 `7dc646d`（`Initial TaskFlow MVP`）。
- `git push -u origin main`：成功创建远程 `main`，本地 `main` 跟踪 `origin/main`。推送候选文件仅包含项目代码、测试与文档；`.env` 和 `.mysql-test/` 被 Git 忽略。
- 本进度与验收报告随仓库交付记录同步到远程仓库。

## 阶段四已完成

- 将认证和任务测试的隔离数据库夹具收拢到 `tests/conftest.py`，每个用例使用独立临时 SQLite 文件、FastAPI 依赖覆盖及 SQLite 外键检查。
- 补充外键约束测试；复核认证、任务 CRUD、权限隔离、分页筛选和异常响应。
- 扩充 README：功能、技术栈、目录、依赖与 MySQL 准备、环境配置、迁移、启动、Swagger 演示顺序、测试、已知限制及可选扩展。
- 新增逐项验收报告 `docs/agent/ACCEPTANCE.md` 与实际实现的面试说明 `docs/agent/INTERVIEW_NOTES.md`。
- 核对 `.env.example` 只含占位值、`.gitignore` 忽略本地环境文件；应用启动不自动建表。
- 在项目内配置独立的本机 MySQL 8.0.46 测试实例（`127.0.0.1:3307`）、专用库与账号，并把随机生成的连接凭据和 JWT 密钥写入被 Git 忽略的 `.env`；实例数据、管理配置和重启脚本位于被忽略的 `.mysql-test/`。原有 MySQL80 服务（3306）未改动。

## 阶段四实际运行命令及结果

- `python -m pytest -q`：**47 passed、0 failed**，1 条已安装 FastAPI TestClient 与 HTTPX 组合的 Starlette 弃用警告。
- `ruff check app alembic tests`：All checks passed；`python -m compileall -q app alembic tests`：退出码 0。
- `python -m pip install --dry-run -r requirements.txt`：当前环境中所列依赖均已满足；`python -m pip check`：No broken requirements found。
- 在全新临时 SQLite 库执行 `python -m alembic upgrade head` 与 `alembic current`：成功到 `0001_initial (head)`；既有 SQLite 验证库执行 `alembic check`：No new upgrade operations detected。
- 启动真实 Uvicorn，并用 HTTPX 完成 `/health`、`/docs`、OpenAPI、注册→登录→`/me`→任务创建→列表→详情→更新→删除链路，状态码分别符合契约，删除为空响应体。
- 用占位 MySQL URL 执行 `python -m alembic upgrade head --sql`：生成 users/tasks、外键、索引及枚举 CHECK 的离线 SQL；未连接 MySQL。
- `rg` 核对 `app/` 与 `alembic/` 不调用 `create_all()`，`app/` 与依赖文件没有总控禁止的运行组件。
- 初始化本地 `main` Git 仓库；`git check-ignore -v --no-index` 确认 `.env` 与 `.env.*` 被忽略、`.env.example` 保留；`git add --dry-run .` 未列出敏感环境文件。阶段四验收当时尚无提交或远程地址，随后已完成仓库交付。
- 对独立 MySQL 8.0.46 空库执行 `python -m alembic upgrade head`：成功；`python -m alembic current`：`0001_initial (head)`；`python -m alembic check`：No new upgrade operations detected。通过 SQLAlchemy 实际检查 users/tasks 字段、owner 索引、外键和 status/priority CHECK 约束。
- 在该 MySQL 实库上启动 Uvicorn，并用 HTTPX 验证健康检查、文档、双用户注册/登录、`/me`、任务创建/列表/更新/删除、跨用户 404、未认证 401、非法分页 422、UTC 时间和 204 空响应体，结果均符合契约。
- 创建 `.env` 后再次执行 `python -m pytest -q`：47 passed；`ruff check app alembic tests`：All checks passed。`git check-ignore -v` 确认 `.env` 和 `.mysql-test/` 内文件均被忽略；无密码 root 连接返回 1045。

## 阶段四遗留问题与未验证项

- 原有 MySQL80 服务（3306）没有项目账号，本次未接入或修改；实际 MySQL 验收在独立的 3307 实例完成。
- 3307 测试实例当前在后台运行，未配置为 Windows 服务或开机自启；本机重启后需运行 `.mysql-test/start.ps1`。
- 阶段四验收时尚未创建提交或远程地址；随后已创建私有 GitHub 仓库并推送，见上方仓库交付记录。
- 未从零创建虚拟环境并安装依赖；本次在已有 Python 环境完成依赖核对。
- 自动化测试有 1 条第三方 TestClient 弃用警告，无失败项。

## 运行与后续

- 本机已有被忽略的 `.env` 和独立 MySQL 测试库，可按 README 运行 `alembic upgrade head`、`uvicorn app.main:app --reload` 并在 `/docs` 演示。电脑重启后先运行 `& '.\.mysql-test\start.ps1'`。在其他机器或原有 3306 服务上运行时，仍需按 README 创建独立库与账号、配置环境并重新验收。
- 可选 V2 扩展：团队空间、Redis 缓存、Docker、Agent 自然语言任务创建。仅建议，当前均未实现。

## 阶段三历史记录

### 阶段三已完成

- 实现 `POST /api/v1/tasks`、`GET /api/v1/tasks`、`GET /api/v1/tasks/{task_id}`、`PATCH /api/v1/tasks/{task_id}`、`DELETE /api/v1/tasks/{task_id}`。
- 所有任务接口依赖当前认证用户；创建时由服务端设定 owner_id，客户端传入或修改 owner_id 返回 422。
- 详情、更新和删除都以 task id 与 owner id 联合条件查询；不存在或非本人任务统一 404。
- 列表限定当前用户，支持状态/优先级筛选、page 与 page_size 分页，返回过滤后 total；按 created_at DESC、id DESC 稳定排序。
- 局部更新区分未传字段与显式 null；title/status/priority 不可置 null，description/due_date 可清空。输入时间转换为 UTC naive，响应时间标记 UTC；更新时刷新 updated_at。
- 删除成功返回 204 与空响应体。模型与迁移无需调整，未改写历史迁移。

### 阶段三实际运行命令及结果

- 开始前 `python -m pytest -q`：19 passed，确认前两阶段回归基线。
- 完成后 `python -m pytest -q`：46 passed，1 条已安装 FastAPI TestClient 的 Starlette/httpx 弃用警告。任务测试使用独立 SQLite 数据库，涵盖双用户 CRUD、跨用户详情/更新/删除 404、列表隔离、筛选分页与稳定排序、未认证 401、非法输入 422、UTC 时间和 204 空响应体。
- `ruff check app alembic tests`：All checks passed。
- `python -m compileall -q app alembic`：通过。
- 对新 SQLite 验证库执行 `python -m alembic upgrade head`：迁移成功；`python -m alembic current`：`0001_initial (head)`；`python -m alembic check`：No new upgrade operations detected。
- 通过 TestClient 请求 `/health`、`/docs`：均返回 200；OpenAPI 列出全部五种任务操作。

### 阶段三遗留问题与未验证项

- 当前环境仍无 MySQL 8.0 服务，任务接口和迁移未在 MySQL 实库验证；已在隔离 SQLite 数据库验证。
- 测试中仍有一条 FastAPI/Starlette TestClient 与 HTTPX 组合的弃用警告。

### 第四阶段准备事项（历史记录）

- 保留当前认证与任务 API 契约；重点复核跨用户隔离、数据库异常处理和真实 MySQL 迁移（若环境可用）。
- 任务详情、更新、删除必须继续在 SQL 查询中同时限定 task id 与 owner id；owner_id 只取自认证上下文。
- 本阶段测试真实运行通过，但简历中的测试覆盖表述应按第四阶段总体验收规则决定。

## 阶段二历史记录

### 阶段二已完成

- 注册密码至少 8 个字符，响应只返回 id、username、email、created_at，不返回密码或哈希。
- 用 pwdlib Argon2 哈希和校验密码；用 PyJWT 签发和验证 HS256 Token，含字符串用户 id `sub` 与 `exp`。
- 注册服务检查用户名/邮箱重复，并在并发唯一约束冲突时回滚事务、返回 409。
- 建立 `get_current_user` 依赖：读取 Bearer Token，校验签名、算法、到期时间、用户 id 和用户存在性；认证失败返回带 `WWW-Authenticate: Bearer` 的 401。
- 增加注册、用户名表单登录和 `/me` 路由，并在 Swagger UI 中配置 OAuth2 Password Flow。
- 数据库 engine 延迟到第一次获取会话时创建，使 `/health` 和 `/docs` 在未配置数据库时仍可访问。

### 阶段二实际运行命令及结果

- `python -m pytest -q`：19 passed，1 条已安装 FastAPI TestClient 的 Starlette/httpx 弃用警告。测试使用隔离 SQLite 数据库，涵盖注册、用户名/邮箱冲突、Argon2 哈希、登录成功/失败、有效/缺失/伪造/过期 Token、缺少 exp、不允许的算法、用户不存在及唯一约束异常回滚。
- `ruff check app alembic tests`：All checks passed。
- `python -c "from fastapi.testclient import TestClient; ..."`：无数据库环境变量时 `/health` 返回 200 与指定 JSON，`/docs` 返回 200；OpenAPI 显示 OAuth2 Password Flow，tokenUrl 为 `/api/v1/auth/login`。
- 启动 Uvicorn 子进程并请求 `http://127.0.0.1:8767/health`、`/docs`：分别返回 200 与 `{"status":"ok"}`、200；测试后终止子进程。
- `python -m compileall -q app alembic`：通过。
- 使用全新 SQLite 验证库执行 `python -m alembic upgrade head`：迁移成功；`python -m alembic current`：`0001_initial (head)`；`python -m alembic check`：No new upgrade operations detected。

### 阶段二遗留问题与未验证项

- 当前环境仍无 MySQL 8.0 服务，认证流程及迁移未在 MySQL 实库运行；已在隔离 SQLite 数据库验证。
- 已安装 FastAPI/Starlette TestClient 与 HTTPX 组合会产生一条弃用警告。

### 第三阶段准备事项（历史记录）

- 登录表单 `username` 字段接收注册用户名，不接收邮箱。
- 任务路由可通过 `Depends(get_current_user)` 获取 User，并使用 `Depends(get_db)` 获取同步 Session；查询任务必须同时限定 task id 与 owner id。
- Token 含 `sub`（用户 id 字符串）和 `exp`，只接受 HS256；密钥和有效期来自环境配置。

## 阶段一历史记录

### 已完成

- 建立 Python 依赖清单、`.gitignore`、`.env.example` 和本地运行说明。
- 建立 FastAPI 应用及不依赖数据库的 `GET /health`，Swagger UI 可访问。
- 建立环境变量配置、同步 SQLAlchemy engine、Session 工厂与 `get_db` 依赖。
- 建立 User/Task ORM，包含唯一约束、外键、owner 索引、枚举检查约束和 UTC naive 数据库存储约定。
- 建立基础 Pydantic v2 输入/响应 schema；带时区的到期时间转换为 UTC naive，响应时间标为 UTC。
- 建立 Alembic 配置和首个迁移 `0001_initial`。应用启动不调用 `create_all()`。

### 实际运行命令及结果

- `python --version`：Python 3.13.9。
- `python -m pip install "alembic>=1.13,<2" "PyMySQL>=1.1,<2" "pwdlib[argon2]>=0.2,<1"`：依赖安装成功。
- `python -m pytest -q`：5 passed，1 条来自已安装 FastAPI TestClient 的 Starlette/httpx 弃用警告。
- `ruff check app alembic tests`：All checks passed。
- `python -m compileall -q app alembic`：通过。
- 以临时环境变量 `DATABASE_URL=sqlite:///./foundation_verify.db`、`JWT_SECRET_KEY=verification-only` 运行 `python -m alembic upgrade head`：创建首次迁移；`python -m alembic current`：`0001_initial (head)`；`python -m alembic check`：No new upgrade operations detected。
- 检查 SQLite 实际表：users、tasks 字段/空值约束符合契约；owner 索引及 status/priority CHECK 约束存在。
- 使用占位 MySQL URL 运行 `python -m alembic upgrade head --sql`：离线生成包含 users、tasks、外键、索引及枚举 CHECK 的 SQL；此命令未连接 MySQL。
- `python -m uvicorn app.main:app --host 127.0.0.1 --port 8765`：启动成功；请求 `/health` 返回 HTTP 200 和 `{"status":"ok"}`，`/docs` 返回 HTTP 200。

### 遗留问题与未验证项

- 当前环境未提供 MySQL 服务或客户端，未在 MySQL 8.0 上运行 `alembic upgrade head`、`alembic current` 或核对表结构。需要在具备 MySQL 的环境按 README 操作。
- 工作目录原本不是 Git 仓库，因此只能检查 `.gitignore` 内容，不能运行 `git check-ignore` 验证跟踪状态；工作目录中没有 `.env` 文件。
- 测试警告来自已安装的 FastAPI/Starlette TestClient 与 HTTPX 组合，不影响上述 5 项测试结果。

### 第二阶段准备事项（历史记录）

- 认证阶段可复用 `app.core.config.get_settings`、`app.db.session.get_db`、User ORM 和 User schema。
- JWT 密钥须由实际环境提供；只允许 HS256，切勿提交 `.env` 或记录明文密码/Token。
- MySQL 使用 UTC naive DATETIME；API 输出要保持明确的 UTC 时间标记。
