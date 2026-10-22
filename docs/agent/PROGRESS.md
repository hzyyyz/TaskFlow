# TaskFlow 阶段进度

## 当前阶段

阶段五已完成补充验收：移动浏览器视口、错误提示和断网场景通过，详见 [FRONTEND_ACCEPTANCE.md](FRONTEND_ACCEPTANCE.md)。阶段六 Docker Compose 已完成本机运行验收：2026-10-22 安装 Docker Desktop 29.9.2、Compose 5.6.1、WSL 3.0.3 后重启，三服务启动，数据库和后端健康检查通过；同源 API、浏览器流程和重启后数据持久化均实测通过。后端 48 项测试与前端 2 项测试通过。阶段六详情见 [ACCEPTANCE.md](ACCEPTANCE.md)。GitHub 仓库现已公开；本次交付提交包含阶段五和六的实现。

## 阶段六已完成

- 新增根目录 `Dockerfile`、`.dockerignore`、`compose.yaml`；新增 `frontend/Dockerfile`、`frontend/nginx.conf`、`frontend/.dockerignore`。Compose 定义前端、后端、MySQL 8 三服务与数据库命名卷；仅前端发布宿主机端口。
- MySQL 使用账户查询健康检查；后端等待数据库健康，执行 `alembic upgrade head` 成功后才启动 Uvicorn；前端等待后端健康。后端用非 root 用户，三个服务配置重启和日志轮转。
- 生产前端 Axios 使用同源相对 API 路径，本地开发继续使用 `VITE_API_BASE_URL`。Nginx 保留 `/api/` 原 URI 代理到 `backend:8000`，SPA 深链接回退至 `index.html`。
- `.env.example` 增加 Docker 变量占位符；本机被忽略的 `.env` 增加随机 MySQL 密码和 Compose 变量。README 增加部署、排障、备份、停机和回滚说明；`.gitignore` 忽略 `backups/`。

## 阶段六实际命令与结果

- PyYAML 解析 `compose.yaml` 并核对三服务、内部依赖、MySQL 命名卷、健康检查、仅前端发布端口：通过。核对本地 `.env` 含所需 Compose 变量、密码为随机 URL 安全字符且长度不少于 24：通过；`git check-ignore` 确认 `.env`、`frontend/.env.local` 和备份目录被忽略。
- `npm run build`：成功，3169 个模块；主 JS 约 1160.99 kB，仍有大包提示。检查产物包含 `/api/v1/auth/login` 且不含 `http://localhost:8000`：通过。
- `npm run test`：2 passed；`npm run lint`：退出码 0，保留原有 5 条 React 规则告警。
- `python -m pytest -q`：48 passed，1 条第三方弃用警告；`ruff check app alembic tests`：All checks passed；`git diff --check`：退出码 0。
- 2026-10-22 安装 Docker Desktop 29.9.2、Compose 5.6.1 与 WSL 3.0.3 并重启后，`wsl --status` 显示默认分发 `docker-desktop`、默认版本 2；`docker info` 返回服务端 29.9.2。`docker compose config --quiet` 和 `docker compose up -d --build` 退出码均为 0。`docker compose ps`：db、backend 健康，frontend 运行，仅 `127.0.0.1:8080` 发布到宿主机；后端日志显示 MySQL 上执行 `0001_initial` 迁移。
- 经 `http://127.0.0.1:8080` 同源入口验收：SPA 首页、登录/注册/工作台/任务/看板深链接与 `/health` 均返回 200；双用户注册、表单登录、`/me`、任务 CRUD、分页、筛选、看板状态、UTC 时间、401/404/422 和跨用户隔离均符合预期。`docker compose restart` 后任务仍在，容器内 `python -m alembic current` 为 `0001_initial (head)`；测试任务随后删除。
- Chrome 无头浏览器实际完成注册、登录、创建任务、刷新、看板查看、删除、退出和受保护路由跳转。修复 Nginx 转发 `Host` 时丢失宿主机端口的问题：带尾部斜杠的 API 请求现在 307 到 `http://127.0.0.1:8080/api/v1/tasks`，跟随重定向得到预期 401。最终重跑 `python -m pytest -q`：48 passed；`npm run test`：2 passed；`ruff check app alembic tests` 与 `git diff --check` 退出码 0。

## 阶段六遗留问题与下一步

- 本机 Docker 三服务已运行；访问 `http://localhost:8080/`。生产对外部署仍需另行配置 HTTPS、反向代理、密钥管理与定期备份，本阶段未做远程部署。
- 当前本机的 Docker 数据卷与独立的 Windows MySQL 3307 测试库互不相通；现有测试账号不会自动出现在新容器库中。需要保留数据时按备份/恢复流程迁移。
- 阶段六只新增部署配置与生产前端地址选择，并将 Nginx 上游 `Host` 改为保留外部端口；没有修改业务 API、认证协议或数据库迁移。

## 阶段五后的 Windows 一键启动入口

- 新增 `start-taskflow.cmd` 与 `scripts/start-taskflow.ps1`、`scripts/run-backend.ps1`、`scripts/run-frontend.ps1`。双击入口复用本机 MySQL 启动脚本，执行 `alembic upgrade head`，启动或复用 8000/5173 端口的服务，并尝试打开前端页面。前端固定 5173 端口，防止自动换端口造成 CORS 不匹配。
- 实测 `cmd /c start-taskflow.cmd`：MySQL 已运行、迁移成功、前后端就绪，退出码 0。三个 PowerShell 脚本均为 0 个解析错误。
- 受限执行环境拒绝自动打开浏览器；启动器已改为显示 `http://localhost:5173/`，服务启动不因此报失败。普通桌面双击时自动打开浏览器的行为尚未实测。

## 阶段五已完成

- 新增 `frontend/`：Vite + React + TypeScript、Ant Design、Axios、React Router；包含登录、注册、工作台、任务列表与看板，响应式侧边栏及移动抽屉。
- 实现统一 API 客户端、Bearer Token、路由保护、刷新后 `/auth/me` 校验、登录表单编码、401 会话退出和各类错误提示。
- 任务列表支持状态与优先级筛选、分页、创建/编辑/确认删除；看板分页加载并通过 PATCH 修改状态；工作台基于真实 `total` 统计。
- 后端 `app/main.py` 增加只允许配置的本地前端 Origin 的 CORS；`tests/test_foundation.py` 增加允许/拒绝 Origin 回归测试。既有 API 与数据库迁移未变。
- 更新根目录 `README.md`、新增 `frontend/README.md` 和 `.env.example`、新增 [FRONTEND_ACCEPTANCE.md](FRONTEND_ACCEPTANCE.md)。

## 阶段五实际运行命令及结果

- `npm install --offline --cache .npm-cache`：成功，125 个包、0 个已知漏洞；此前已完成在线依赖安装并生成 `package-lock.json`。
- `npm run dev`：本机 Vite 可访问，`http://localhost:5173/` 返回 200；后端 `/health` 返回 200。
- `npm run test`：2 passed；`npm run lint`：退出码 0、5 条规则告警；`npm run build`：成功，最终主 JS 约 1161.01 kB，存在超过 500 kB 的提示。
- `python -m pytest -q`：48 passed，1 条第三方弃用警告；`ruff check app alembic tests`：All checks passed。
- `python -m alembic current`：MySQL `0001_initial (head)`。
- 真实浏览器联调完成双账号注册/登录、`/me`、任务创建/筛选/编辑/看板变更/删除/退出，以及刷新后的会话恢复；第二账号看不到第一账号数据。具体见前端验收报告。

## 阶段五未验证项与后续

- 2026-10-22 使用隔离 Chrome 上下文补验 390×844 移动视口、抽屉导航、任务创建，以及真实后端的 401/404/409、断网反馈；422 页面反馈用模拟响应验证，后端真实 422 由自动化测试覆盖。实体手机未测。结果见前端验收报告。
- 阶段五验收时改动尚未提交；本次交付提交包含前端实现。启动时先确保本机 MySQL 测试实例和后端运行，随后在 `frontend/` 运行 `npm install`、`npm run dev`；前端环境变量和 Token 风险见 README。

## GitHub 仓库交付

- 最初创建私有仓库 `https://github.com/hzyyyz/TaskFlow`，后来改为公开；本地 `origin` 指向其 HTTPS 地址。
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
