# 阶段二：用户注册、登录与 JWT 鉴权（预计 1 天）

## 开始前
完整阅读 `docs/agent/00_PROJECT_RULES.md`、`01_FOUNDATION.md` 和 `docs/agent/PROGRESS.md`。检查阶段一实际代码与数据库迁移；若有阻塞，先修复并记录。只实现本阶段。

## 目标
建立可复用的身份认证能力，并为第三阶段的任务数据隔离提供 `get_current_user` 依赖。

## 实现任务
1. 完善 `app/schemas/user.py`：UserCreate（username、email、password）、UserRead（id、username、email、created_at）。密码设置合理的最小长度，不在任何响应中返回密码或哈希。
2. `app/core/security.py`：使用 `pwdlib[argon2]` 哈希与校验密码；用 PyJWT 签发、验证 JWT，固定 HS256，包含 `sub` 和 `exp`，过期时间来自配置。
3. `app/services/auth_service.py`：实现用户注册与身份验证，处理 username/email 唯一冲突（包含并发情况下的 IntegrityError 与回滚），失败时不泄露敏感信息。
4. `app/api/deps.py`：通过 OAuth2PasswordBearer 读取 Bearer Token；验证 JWT、解析用户 id、查询当前用户；Token 无效、过期、用户不存在时返回 401，并设置正确的 WWW-Authenticate 头。
5. `app/api/auth.py`：实现：
   - `POST /api/v1/auth/register`：JSON 注册，201；重复用户名/邮箱 409。
   - `POST /api/v1/auth/login`：`OAuth2PasswordRequestForm` 表单登录，`username` 字段传用户名；返回 access_token/token_type，错误凭证 401。
   - `GET /api/v1/auth/me`：需认证，返回当前用户。
6. 将认证路由注册到 app，确保 `/docs` 中 OAuth2 Password Flow 可使用。注意安装 `python-multipart`。
7. 添加最小认证测试：注册成功、重复注册、登录成功/失败、无 Token、无效 Token、`/me` 正常；测试应使用隔离数据库，不污染开发数据。

## 不做
不实现任务 CRUD，不添加 refresh token、短信/邮件验证码、RBAC、Redis 黑名单或第三方登录。

## 验收
- 注册成功 201，返回不含 hashed_password。
- 相同用户名或邮箱注册 409。
- 正确凭证登录 200，得到可用 Bearer Token；错误凭证 401。
- `/auth/me` 使用有效 Token 200；缺失/伪造/过期 Token 401。
- 密码在数据库中为 Argon2 哈希，而非明文。
- 阶段一健康检查和数据库迁移仍正常。

## 阶段结束交接
更新 `docs/agent/PROGRESS.md`，说明登录表单使用用户名而非邮箱、Token claim、依赖入口、测试命令和结果。停止，不进入阶段三。
