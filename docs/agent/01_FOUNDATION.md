# 阶段一：基础架构与数据库（预计 1 天）

## 开始前
完整阅读 `docs/agent/00_PROJECT_RULES.md`，检查仓库现状和 `docs/agent/PROGRESS.md`。只实现本阶段。

## 目标
建立可启动、可配置、可迁移的 FastAPI 后端基础设施，为后续认证和任务模块提供稳定数据模型。

## 实现任务
1. 初始化 Python 项目、`requirements.txt`、`.gitignore`、`.env.example`，写清本地环境创建和依赖安装步骤。
2. 创建 `app/main.py`，定义 FastAPI app、`GET /health` 返回 `{"status":"ok"}`，确认 `/docs` 可用。
3. 用 pydantic-settings 从环境变量加载 `DATABASE_URL`、`JWT_SECRET_KEY`、`JWT_ALGORITHM=HS256`、`ACCESS_TOKEN_EXPIRE_MINUTES=60`；不在代码中硬编码敏感配置。
4. 创建同步 SQLAlchemy 2.0 engine、`sessionmaker`、`DeclarativeBase`，并提供 `get_db` 依赖（Session 结束后释放）。MySQL 驱动为 PyMySQL。
5. 按总控文件定义 User、Task ORM 模型、字段约束、外键、索引及关系；status/priority 使用可验证的枚举取值，确保 MySQL 和测试数据库兼容。
6. 建立 Alembic 配置，确保 autogenerate 能加载全部 ORM 模型，创建首次迁移文件。不要在 app 启动时自动建表。
7. 创建基础 Pydantic 响应/输入 schema（后续阶段可补齐），遵循 Pydantic v2 `from_attributes`。
8. README 写清启动命令、MySQL 数据库准备、Alembic upgrade 命令、Swagger 地址。

## 不做
不实现注册、登录、JWT 实际签发、任务 CRUD、前端、Redis、Docker；不为下一阶段提前写大量业务代码。

## 验收
- `uvicorn app.main:app --reload` 可启动。
- `GET /health` 返回 200 和指定 JSON。
- `/docs` 可访问。
- `alembic upgrade head` 能创建 users、tasks 表（有 MySQL 时实际验证）。
- `alembic current` 与迁移版本一致；表字段与总控契约一致。
- `.env` 不纳入 Git，`.env.example` 不含真实密钥。

## 阶段结束交接
更新 `docs/agent/PROGRESS.md`，列出实际运行的命令、迁移结果、尚未验证的项目和下一阶段可复用模块。停止，不进入阶段二。
