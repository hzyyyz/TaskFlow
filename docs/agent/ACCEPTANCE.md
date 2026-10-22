# TaskFlow 最终验收报告

## 阶段六 Docker Compose 运行验收（2026-10-22）

首次记录时本机没有 `docker` 命令。安装 Docker Desktop 29.9.2、Compose 5.6.1 与 WSL 3.0.3 并重启 Windows 后，已通过本机容器运行验收。验收入口为 `http://127.0.0.1:8080`，数据库是 Docker 命名卷中的独立 MySQL 8，不是原有 Windows 3307 测试库。

| 项目 | 实际结果 |
| --- | --- |
| Compose 结构 | PyYAML 解析成功；包含 `frontend`、`backend`、`db` 三服务，数据库命名卷 `db_data`。`docker compose config --quiet` 退出码 0。 |
| 凭据与构建上下文 | Compose 从 `.env` 读取 JWT/MySQL 凭据；Dockerfile 没有密钥 ARG；两套 `.dockerignore` 排除本地环境文件。`git check-ignore` 确认 `.env`、`frontend/.env.local`、`backups/` 被忽略。 |
| 前端生产构建 | `npm run build` 成功；检查构建 JS 不含开发 API 地址 `http://localhost:8000`，保留 `/api/v1/auth/login` 路径。`npm run test`：2 passed；`npm run lint`：退出码 0，5 条既有告警。 |
| 后端兼容性 | `python -m pytest -q`：48 passed、1 条第三方弃用警告；`ruff check app alembic tests`：All checks passed。未修改原有 API 路由、schema 或迁移。 |
| Docker CLI | 安装后 `docker --version` 输出 29.9.2，`docker compose version` 输出 v5.6.1，`docker compose config --quiet` 退出码 0。 |
| Docker 引擎前置条件 | Windows 的 VirtualMachinePlatform 与 WSL 功能已启用；CPU 固件虚拟化和 SLAT 均为 True。重启后 `wsl --status` 显示默认分发 `docker-desktop`、默认版本 2；`docker info` 返回服务端 29.9.2。 |
| 镜像与容器 | `docker compose up -d --build` 退出码 0。`docker compose ps` 显示 db、backend 健康，frontend 运行；仅 frontend 发布 `127.0.0.1:8080->80/tcp`，backend 和 db 只显示容器内部端口。 |
| MySQL 与迁移 | 后端容器日志显示 `Context impl MySQLImpl` 和 `Running upgrade -> 0001_initial`，随后 Uvicorn 启动。`docker compose restart` 后在 backend 执行 `python -m alembic current`，输出 `0001_initial (head)`。 |
| Nginx 与 SPA | 对 `/`、`/login`、`/register`、`/dashboard`、`/tasks`、`/board` 的 HTTP 请求均为 200 且返回 SPA HTML；同源 `/health` 为 200、`{"status":"ok"}`。修复上游 `Host` 丢失外部端口后，`/api/v1/tasks/` 的 307 `Location` 保留 `:8080`，跟随跳转得到预期 401。 |
| 容器 API 链路 | 经 `8080` 同源入口，双用户注册 201、表单登录与 `/me` 200；任务创建 201、详情/更新/分页/状态和优先级筛选 200、删除 204。非法登录与未授权任务为 401，非法分页为 422；另一用户的任务列表为空，对任务详情/更新/删除均为 404。带时区到期时间转换为 UTC `Z`。 |
| 重启持久化 | 创建双用户任务后执行 `docker compose restart`，两用户任务仍可读取且状态与 owner 保持正确；随后删除本次测试任务。MySQL 命名卷未删除。 |
| 浏览器联调 | Chrome 无头浏览器通过 Docker 前端实际完成注册、登录、创建任务、刷新后仍显示任务、看板查看、删除、退出及受保护路由跳转；无页面脚本错误或 API 5xx。 |
| 最终回归 | `python -m pytest -q`：48 passed、1 条第三方弃用警告；`npm run test`：2 passed；`ruff check app alembic tests`：All checks passed；`git diff --check` 退出码 0。 |

**验收过程中的失败与处理：** 首次 HTTP 脚本对任务集合使用尾部斜杠，FastAPI 返回 307；改用契约中的规范路径 `/api/v1/tasks` 后全套 API 验收通过。进一步发现该 307 的 `Location` 曾丢失外部 `8080` 端口，已将 Nginx 上游 `Host` 改为 `$http_host`，重建前端并验证重定向。浏览器脚本首次因未找到 Popconfirm 的确认按钮而超时，截图显示按钮实际存在；修正定位器后完整浏览器流程重跑通过。上述失败均已处理并复验。

**范围限制：** 本次只验收本机 Docker Compose；未做远程部署、HTTPS 或跨机器备份恢复。容器 MySQL 与本机独立 3307 数据库互不相通，原有测试账号不会自动迁移。

## 环境与范围

- 执行环境：Windows、Python 3.13.9；项目要求 Python 3.11+。
- 验收范围：健康接口、注册登录、JWT 鉴权、任务 CRUD、权限隔离、输入校验、分页筛选、迁移、启动文档与演示链路。
- 自动化测试使用每个用例独立的临时 SQLite 文件，通过 FastAPI `dependency_overrides` 注入 Session，并启用 SQLite 外键检查；不连接开发数据库。

## 已通过

| 项目 | 实际验证与结果 |
| --- | --- |
| 依赖 | `python -m pip install --dry-run -r requirements.txt` 显示当前环境满足依赖；`python -m pip check` 输出 `No broken requirements found.` |
| 自动化测试 | `python -m pytest -q`：**47 passed、0 failed**；1 条 FastAPI TestClient 与 HTTPX 的 Starlette 弃用警告。覆盖健康检查、注册/重复注册、Argon2 哈希、登录成功/失败、有效/无效/过期 Token、`/me`、任务 CRUD、分页筛选、非法输入、未认证与跨用户隔离。 |
| 静态与编译 | `ruff check app alembic tests`：`All checks passed!`；`python -m compileall -q app alembic tests`：退出码 0。 |
| SQLite 迁移 | 全新临时 SQLite 库执行 `python -m alembic upgrade head` 成功，`alembic current` 为 `0001_initial (head)`；现有 SQLite 验证库执行 `alembic check` 为 `No new upgrade operations detected.` |
| MySQL 离线 SQL | 使用占位 MySQL URL 执行 `python -m alembic upgrade head --sql`，生成 users/tasks 建表、外键、owner 索引及枚举 CHECK 语句；此项仅验证 SQL 生成。 |
| MySQL 8.0.46 实库迁移 | 在项目内独立数据目录启动仅绑定 `127.0.0.1:3307` 的 MySQL 8.0.46 实例，创建专用 `taskflow_acceptance` 库与账号；`python -m alembic upgrade head` 成功，`current` 为 `0001_initial (head)`，`check` 显示 `No new upgrade operations detected.`。实际检查 users/tasks 字段、外键、owner 索引和枚举 CHECK 约束。 |
| MySQL 实际 HTTP 验收 | 在该 MySQL 实例上启动 Uvicorn，以 HTTPX 验证 `/health`、`/docs`、两个用户注册登录与 `/me`、任务创建/列表/更新/删除、跨用户 404、未认证 401、非法分页 422、UTC 输出及 204 空响应体，全部得到预期结果。 |
| 实际 HTTP 演示 | 在迁移后的全新临时 SQLite 库上启动 Uvicorn，HTTPX 请求 `/health`、`/docs`、`/openapi.json` 均为 200；注册 201、登录和 `/me` 200、创建任务 201、列表/详情/更新 200、删除 204 且响应体为空。OpenAPI 列出全部契约路径。 |
| 安全与配置检查 | 本机 `.env` 已写入生成的专用测试库连接与随机 JWT 密钥，`.gitignore` 忽略 `.env`、`.env.*`、`.mysql-test/` 并保留 `.env.example`；示例文件只含占位凭据。空密码 root 登录测试被 MySQL 1045 拒绝。`app/` 与 `requirements.txt` 未发现总控禁止的运行组件，`app/` 和 `alembic/` 中未调用 `create_all()`。 |
| Git 仓库与忽略规则 | 已初始化本地 `main` 仓库并推送到私有仓库 `hzyyyz/TaskFlow`。`git check-ignore -v --no-index` 确认 `.env`、`.env.local`、`.env.production` 及 `*.db` 被忽略，`.env.example` 不被忽略；暂存候选文件中没有环境密钥或 `.mysql-test/` 数据。`git push -u origin main` 成功。 |

## 未验证

| 项目 | 原因与所需条件 |
| --- | --- |
| 原有 MySQL80 服务（3306） | 没有该服务的项目账号，本次未修改它的配置或数据；验收使用了独立的本机 MySQL 8.0.46 实例（3307）。 |
| 全新虚拟环境安装 | 当前依赖检查在已有 Python 环境中运行；没有从零创建新虚拟环境并联网安装。README 提供了步骤。 |
| 测试实例开机自启 | 3307 测试实例当前以后台进程运行，但没有安装为 Windows 服务或配置开机自启。重启电脑后可在项目目录运行 `& '.\.mysql-test\start.ps1'`；该数据目录和脚本在 Git 忽略目录中，仅此开发机可用。 |

## 过程中失败与处理

- 合并测试夹具时，`import app.models` 遮蔽了 FastAPI 实例变量，首次运行有 41 个夹具初始化错误。将实例变量明确命名为 `fastapi_app` 后重跑，最终 47 项测试全部通过。
- 首次实际 HTTP 演示在 Uvicorn 就绪前连接而超时。增加健康接口就绪等待后重跑，完整演示链路通过。
- 当前无剩余自动化测试失败项；独立 MySQL 8.0.46 实库验收已通过，原有 3306 服务仍未接入。

## 结论

在当前可用环境中，核心认证和跨用户权限流程已由真实运行的自动化测试覆盖；独立 MySQL 8.0.46 空库升级与实际 HTTP 链路也已通过。可以如实描述这些成果，但不能声称已验证原有 3306 服务或远程部署。
