# TaskFlow 前端

React + Vite + TypeScript + Ant Design 前端。运行前需按仓库根目录 [README](../README.md) 准备 MySQL、执行 Alembic 迁移并启动 FastAPI。

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

浏览器打开 `http://localhost:5173`。默认 API 地址写在 `.env.example`，可在被 Git 忽略的 `.env.local` 中修改 `VITE_API_BASE_URL`。若更改前端 Origin，启动后端前将 `FRONTEND_ORIGIN` 设为该准确地址。

检查命令：`npm run test`、`npm run lint`、`npm run build`。
