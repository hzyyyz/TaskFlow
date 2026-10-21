# TaskFlow Agent 分阶段开发提示词

将 `docs/agent/` 文件夹复制到你的 TaskFlow 项目根目录。

## 建议的执行方式
在 Codex 或 Claude Code 中逐次发送：

第一阶段：`请阅读 docs/agent/00_PROJECT_RULES.md 和 docs/agent/01_FOUNDATION.md，严格按阶段一执行，完成验收后停止并更新 PROGRESS.md。`

第二阶段：`请阅读 docs/agent/00_PROJECT_RULES.md、docs/agent/PROGRESS.md 和 docs/agent/02_AUTH.md，检查阶段一成果后执行阶段二，完成验收后停止。`

第三阶段：`请阅读 docs/agent/00_PROJECT_RULES.md、docs/agent/PROGRESS.md 和 docs/agent/03_TASKS.md，检查前两阶段成果后执行阶段三，完成验收后停止。`

第四阶段：`请阅读 docs/agent/00_PROJECT_RULES.md、docs/agent/PROGRESS.md 和 docs/agent/04_TEST_AND_DELIVERY.md，执行最终测试与交付，真实记录验收结果。`

不要一次要求 Agent 执行所有阶段；每个阶段结束后先检查结果再继续。
