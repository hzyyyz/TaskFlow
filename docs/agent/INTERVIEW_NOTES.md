# TaskFlow 面试说明

## 系统与请求链路

FastAPI 同步 `def` 路由接收请求；Pydantic v2 校验输入；`Depends(get_db)` 为请求提供同步 SQLAlchemy Session；service 层执行 ORM 查询和事务；路由返回 Pydantic 响应。`app/main.py` 注册认证与任务路由，`/health` 不查询数据库。同步路由与同步 ORM 配套，避免异步路由中直接阻塞数据库调用。

## 认证链路

注册请求经过 `UserCreate` 校验后，service 用 pwdlib Argon2 哈希密码并写入 users。登录使用 `OAuth2PasswordRequestForm`，`username` 字段接收注册用户名；凭据正确时以 PyJWT 签发 HS256 Token，包含字符串用户 id 的 `sub` 和到期时间 `exp`。`get_current_user` 从 Bearer 头取得 Token，校验签名、固定算法、到期时间和用户是否存在。失败返回带 `WWW-Authenticate: Bearer` 的 401。响应模型不包含密码或哈希。

## Session、事务与权限

`get_db` 每请求开启 Session，并在依赖生成器结束时关闭；engine 在首次数据库请求时创建，因此健康探针不依赖数据库配置。注册先查询重复用户名/邮箱，提交时仍捕获唯一约束 `IntegrityError` 并回滚，以应对并发竞争。任务创建、更新、删除在提交异常时回滚。

任务的 owner id 只从当前认证用户取得，输入模型拒绝客户端提供 owner_id。详情、更新、删除的 ORM 查询同时限定 task id 与 owner id；不存在和别人的任务都返回 404。列表也按 owner id 限定。查询采用 ORM 参数化表达式，不拼接 SQL。

## 分页、时间与迁移

列表先用相同过滤条件计算 total，再按 `created_at DESC, id DESC` 排序并使用 offset/limit 分页。数据库 DATETIME 按 UTC naive 约定存储；带时区的 due_date 输入先转 UTC，响应时间明确以 `Z` 标记。模型默认时间由 UTC 时钟产生，更新时刷新 `updated_at`。

正式表结构由 Alembic 首次迁移 `0001_initial` 创建，应用启动不调用 `Base.metadata.create_all()`。测试夹具才在独立临时 SQLite 库中使用 `create_all()`；生产配置为 MySQL 8.0 + PyMySQL。本机另建独立 MySQL 8.0.46 实例，已真实验证空库升级、模型结构和 HTTP 接口；原有 MySQL80 服务（3306）未改动、未验收。

## 测试策略

`tests/conftest.py` 为每个用例创建独立 SQLite 文件，通过 FastAPI 依赖覆盖注入 Session，并开启 SQLite 外键检查。测试覆盖认证、JWT 失效、任务 CRUD、分页筛选、非法输入、未认证和跨用户隔离。最终 `python -m pytest -q` 为 47 passed、0 failed；实际 Uvicorn + HTTPX 演示链路分别在临时 SQLite 迁移库和独立 MySQL 8.0.46 库上通过。

## 三个可复述的技术难点

1. **唯一约束竞争**：预先检查重复仍不能防止两个请求同时注册。提交时捕获数据库 `IntegrityError`、回滚并统一映射为 409；测试模拟了检查后才发生的冲突，并验证 Session 可继续使用。
2. **跨用户任务隔离**：仅在路由判断 owner 会留下误用风险。service 的任务详情、更新、删除都通过 task id 与 owner id 的联合 SQL 条件取对象；跨用户与不存在均返回 404。测试分别验证读取、修改、删除和列表隔离。
3. **UTC DATETIME 约定**：MySQL DATETIME 不保存时区，直接写入带时区时间会产生歧义。输入必须携带时区，写库前转换为 UTC naive；输出统一附 `Z`。测试检查偏移时区的创建/更新与数据库实际值。
