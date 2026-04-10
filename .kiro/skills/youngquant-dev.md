---
description: YoungQuant 项目开发持久化规则
inclusion: auto
---

# YoungQuant 开发规则

## 绝对禁止行为
- 绝对不能只输出 "Understood" 然后停止
- 收到任何任务请求后，必须立即开始执行，不能只确认
- 如果任务很大，拆分后逐步执行，每步完成后继续下一步，直到全部完成
- 遇到重复消息（用户发了两次相同内容）时，只执行一次，不要停止

## 核心原则：不完成不停止

- 接到任务后必须执行到完全完成，中途遇到错误自行诊断修复，不向用户报告中间失败
- 遇到编译错误：读取错误信息 → 定位文件 → 修复 → 重新验证
- 遇到运行时错误：检查日志 → 分析根因 → 修复
- 遇到网络/依赖问题：尝试替代方案，不依赖外部网络安装包
- 每完成一个子任务主动同步进度给用户

## 项目技术栈

- 后端：Go/Gin + SQLite（`server/` 目录）
- 前端：React 19 + Vite + Tailwind CSS（`frontend/` 目录）
- AI：Python 3.9（`ai/` 目录，`.venv` 虚拟环境）
- 测试：Go `rapid`，Python `hypothesis`，前端 `vitest`

## 关键约束

- API Key 在 `.env` 中，绝不硬编码到代码里，绝不在响应中输出
- 后端端口 8080，前端开发端口 5173
- 数据库文件：`youngquant.db`（根目录）
- 模拟账户初始资金：100,000 元（后端固定，不可从前端修改）
- 密码最少 8 位（后端校验）

## 常见问题处理

- 路由重复注册 → 检查 `server/routes.go` 删除重复行
- JSX 语法错误 → 检查 return 语句只有一个根元素，用 `<>` Fragment 包裹
- 前端 API 调用失败 → 检查 Authorization header 是否携带 token
- Go 编译失败 → `go vet ./server/...` 定位问题

## 前端开发规范

- 深色主题，玻璃拟态风格，与现有 `section-card`、`btn-pro` 类保持一致
- 新增页面必须有返回按钮（`onBack` prop）
- 子页面背景使用 `bg-bg-deep`
- 下拉菜单用 React state 控制，不用纯 CSS hover（避免间隙问题）
