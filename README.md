# YoungQuant — AI 量化模拟交易平台

> 专为 A 股学习者设计的 AI 量化模拟交易平台，零风险练习真实交易规则。

**线上地址：** http://youngquant.top:8080

---

## 功能概览

- **K 线图** — 日线 / 15 分钟线，MA5/MA20/RSI/MACD 指标，新浪财经实时数据
- **模拟交易** — 遵循 A 股真实规则（T+1、涨跌停、万五手续费），市价单 + 限价单
- **AI 对话** — 基于 DeepSeek，自动注入当前股票行情上下文
- **量化回测** — MA 金叉 / MACD 零轴穿越策略，可视化净值曲线
- **学习中心** — 60 天系统课程，K 线、均线、量价、MACD、KDJ 等 100+ 知识点
- **AI 选股** — 多维度筛选候选股票
- **排行榜** — 按收益率排名，支持匿名

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite + Tailwind CSS 4 |
| 后端 | Go 1.25 + Gin |
| AI | DeepSeek API |
| 数据库 | SQLite（开发/生产）|
| 行情数据 | 新浪财经 API（Go 原生，无 Python 依赖）|
| 部署 | Docker Compose |

---

## 本地开发

### 前置条件

- Node.js 22+
- Go 1.25+
- Python 3.11+（AI 模块可选）

### 启动步骤

```bash
# 1. 克隆仓库
git clone https://github.com/OuOing/YOUNGQUANT.git
cd YOUNGQUANT

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY 和 JWT_SECRET

# 3. 启动后端
cd server && go run .

# 4. 启动前端（新终端）
cd frontend && npm install && npm run dev
```

访问 http://localhost:5173

### 环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | ✅ |
| `JWT_SECRET` | JWT 签名密钥（随机字符串） | ✅ |
| `POSTGRES_PASSWORD` | PostgreSQL 密码（Docker 部署时） | Docker 部署时 |

生成 JWT_SECRET：
```bash
openssl rand -hex 32
```

---

## 项目结构

```
youngquant/
├── server/          # Go 后端
│   ├── handlers.go  # API 处理器
│   ├── routes.go    # 路由配置
│   ├── database.go  # 数据库初始化
│   ├── sina_fetch.go # 新浪财经数据拉取
│   └── models.go    # 数据模型
├── frontend/        # React 前端
│   └── src/
│       ├── App.jsx          # 主应用
│       ├── components/      # 组件
│       └── pages/           # 页面
├── ai/              # Python AI 模块
│   ├── advisor.py   # 行情分析
│   ├── chat.py      # 对话助手
│   ├── screener.py  # 选股引擎
│   └── reviewer.py  # 交易复盘
├── data/            # 股票数据（CSV）
├── Dockerfile
├── docker-compose.yml
└── DEPLOY.md        # 部署指南
```

---

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。

快速部署：
```bash
cp .env.example .env
# 填写 .env
docker compose up -d
docker compose exec youngquant ./youngquant_server --migrate
```

---

## 协作开发

1. Fork 或被添加为 Collaborator
2. 创建功能分支：`git checkout -b feature/你的功能`
3. 开发完成后提交 PR，等待 review 后合并到 main
4. 不要直接 push main 分支

---

## 免责声明

本平台仅供学习和模拟练习，所有 AI 分析和交易信号**不构成投资建议**。模拟盘数据与真实市场存在差异，请勿将模拟盈亏作为真实投资参考。
