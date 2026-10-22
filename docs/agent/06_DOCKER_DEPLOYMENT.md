# 阶段六：TaskFlow Docker 容器化部署（预计 1～2 天）

## 开始前（强制）
1. 阅读 `docs/agent/00_PROJECT_RULES.md`、`05_FRONTEND.md`、`docs/agent/PROGRESS.md` 和 `docs/agent/ACCEPTANCE.md`（若存在）。
2. 检查真实仓库的 Python 依赖、应用导入路径、配置字段、数据库连接 URL、Alembic env.py、Vite 构建命令、Axios baseURL 和前端路由。
3. 如果第五阶段未验收通过，报告阻塞并停止。先输出现状、文件修改计划和可能的兼容风险，不凭猜测修改。
4. 只执行阶段六；不重构既有业务逻辑、不增加新业务 API。

## 目标与架构
通过 `docker compose up -d --build` 启动三服务：
- `frontend`：多阶段构建 Node/Vite，运行阶段用 Nginx 托管 `dist/`，并将 `/api/` 代理到 `backend:8000`；SPA 深链接使用 `try_files $uri $uri/ /index.html`。
- `backend`：Python 运行 FastAPI/Uvicorn，监听 `0.0.0.0:8000`，保持现有同步 SQLAlchemy + PyMySQL。
- `db`：MySQL 8，使用命名卷持久化 `/var/lib/mysql`。
仅暴露 frontend 端口（可配置如 8080:80）；backend/db 不向宿主机发布端口。Compose 内部服务使用服务名通信。

## 严格兼容约定
- API 路径保持 `/api/v1/...`，`GET /health` 不依赖数据库。Nginx `/api/` 代理时保留完整 URI，避免意外删除 `/api` 前缀。
- 登录为 `POST /api/v1/auth/login`，`application/x-www-form-urlencoded`，用户名+密码；Bearer JWT，`GET /api/v1/auth/me`。
- 任务列表返回 `{items,total,page,page_size}`；状态 `todo/doing/done`、优先级 `low/medium/high`；越权任务统一 404。
- 生产前端 Axios 请求必须使用同源相对路径；先审查现有 `VITE_API_BASE_URL` 和 URL 拼接规则，确定唯一配置，避免重复前缀。
- 不修改数据库表、认证协议或业务返回结构；保留本地开发流程。

## 交付文件（按真实仓库适配）
- 根目录 `compose.yaml`
- 后端 Dockerfile（放在与现有项目结构一致的位置）和 `.dockerignore`
- `frontend/Dockerfile`、`frontend/nginx.conf`、`frontend/.dockerignore`
- `.env.example` 更新（只放占位符）
- README 新增 Docker 启动、初始化、排障、备份和停机说明
- 必要时最小修改前端生产环境 API 地址配置、后端数据库环境配置、迁移执行入口

## 安全与可靠性
1. MySQL 设置 healthcheck；backend 等待 db 健康再运行迁移/启动，且处理迁移失败：失败即退出，不静默继续。
2. 使用 `alembic upgrade head` 执行迁移，确保只在单个明确的启动路径执行；禁止用 `Base.metadata.create_all()`。
3. Compose 使用 `${...}` 读取 `.env` 变量；JWT_SECRET_KEY、MySQL 密码不可硬编码；不要将凭据作为 Dockerfile ARG 或构建时 Vite 变量。
4. 避免将 DB/后端端口直接映射到宿主机；生产部署前说明 HTTPS、反向代理、密钥强度、备份与升级需求。
5. 配置适当的 restart 策略、日志策略及最小运行权限（在不破坏运行的前提下）；不要为了“生产化”引入额外服务。
6. 不使用匿名卷代替 MySQL 命名卷；严禁在验收或清理指令中默认使用 `docker compose down -v`。
7. 若本机没有 Docker 或数据库不可运行，只生成配置并做静态检查，明确哪些实际验收未执行，不虚报通过。

## 实施顺序
A. 读取真实代码并输出部署映射表（镜像构建上下文、后端入口、DB 配置、迁移、前端构建、API baseURL）。
B. 编写后端 Dockerfile、忽略文件，验证依赖安装及启动命令。
C. 编写前端多阶段 Dockerfile 和 Nginx 配置，处理 SPA 路由与 `/api/` 代理。
D. 编写 Compose、环境变量示例、数据库健康检查和迁移启动机制。
E. 执行 `docker compose config`、`docker compose up -d --build`（如可用），检查容器状态和日志。
F. 在浏览器/HTTP 客户端验收注册→登录→任务 CRUD→筛选→看板→刷新；验证 401/404 和跨用户隔离；重启容器检查数据持久化。
G. 更新 README、`docs/agent/PROGRESS.md` 和 `docs/agent/ACCEPTANCE.md`（若存在），列出验证命令、结果、风险及回滚方式。

## 验收清单
- [ ] `docker compose config` 成功且没有硬编码秘密
- [ ] `docker compose up -d --build` 启动三个容器（如环境允许）
- [ ] Nginx SPA 首页和深链接刷新正常
- [ ] 同源 `/api/v1/auth/login` 可用，Token 可访问 `/auth/me`
- [ ] 任务 CRUD、分页、看板和用户数据隔离与阶段五一致
- [ ] 数据库健康检查与 Alembic 迁移执行成功
- [ ] `docker compose restart` 后数据仍在，迁移可重复执行
- [ ] 无需对外开放 MySQL 和后端端口
- [ ] `.env` 未进入 Git，README 包含部署、日志、备份与排障命令

## 完成后汇报格式
1. 新增/修改文件清单
2. 容器架构及关键配置解释
3. 实际执行命令与验收结果（成功/失败/未执行）
4. 对阶段 01～05 的兼容性检查
5. 已知限制及下一步建议
完成后停止，不自行进入下一阶段。
