# 实施计划：YoungQuant 平台增强功能

## 概述

按照"数据库迁移 → 后端 API → AI 模块 → 前端组件 → 集成测试"的顺序增量实施，每个阶段均可独立验证，不破坏现有功能。需求 19-20（自定义回测、排行榜）为可选高级功能，标记为 `*`。

## 任务

- [x] 1. 数据库迁移：新增表与字段扩展
  - 在 `server/database.go` 的 `initDB()` 中追加新建表的 DDL：`watchlist`、`notes`、`chat_history`、`learning_progress`、`daily_lessons`、`lesson_reads`、`backtest_reports`
  - 在 `server/database.go` 中添加 `migrateAlterTables()` 函数，使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 为 `users` 表添加 `is_public INTEGER DEFAULT 1` 和 `learning_pct REAL DEFAULT 0.0`，为 `portfolios` 表添加 `equity_history_json TEXT DEFAULT '[]'`
  - 在 `server/main.go` 的启动流程中调用 `migrateAlterTables()`
  - 在 `server/database.go` 中预置 60 条 `daily_lessons` 种子数据（覆盖技术分析、基本面分析、交易心理、风险管理四类）
  - _需求：18.1、18.2、18.3、18.4、16.2_


- [x] 2. 后端：用户系统与个人中心 API
  - [x] 2.1 扩展 `handleMe`（`server/handlers.go`），返回 `learning_pct`、`is_public`、`created_at` 字段；新增 `handleUpdateProfile` 处理 `PUT /api/me`（更新 `is_public`）
  - [x] 2.2 新增 `handleWatchlist`（GET/POST/DELETE `/api/watchlist`）：GET 返回用户自选股列表，POST 插入 `watchlist` 表（最多 50 条，超出返回 400），DELETE 按 symbol 删除
  - [x] 2.3 为自选股 CRUD 编写属性测试
    - **属性 25（部分）：笔记/自选股持久化 Round-Trip**
    - **验证：需求 12.2、18.4**
  - _需求：11.3、11.6、12.1、12.2、18.4_

- [x] 3. 后端：笔记系统 API
  - [x] 3.1 新增 `handleNotes`（GET/POST/PUT/DELETE `/api/notes`）：GET 支持 `?symbol=&date=` 筛选；POST 校验 `content` 长度 <= 2000 字，超出返回 400；PUT 更新 `updated_at`；DELETE 按 id 删除
  - [x] 3.2 为笔记 CRUD 编写属性测试
    - **属性 25：笔记内容长度限制与持久化 Round-Trip**
    - **验证：需求 13.1、13.2、13.3、13.4**
  - _需求：13.1、13.2、13.3、13.4、18.1_

- [x] 4. 后端：对话历史持久化 API
  - [x] 4.1 新增 `handleChatHistory`（GET `/api/chat-history`，支持 `?date=` 筛选，最多返回 100 条）；在 `handleAIChat` 中完成对话后自动写入 `chat_history` 表（role=user 和 role=assistant 各一条）
  - [x] 4.2 在 `handleAIChat` 中实现游客消息数量限制：从请求 header 或 body 中读取 `session_count`，若 >= 5 且用户未登录则返回 403 并提示注册
  - [x] 4.3 为对话历史持久化编写属性测试
    - **属性 10：对话历史持久化 Round-Trip**
    - **验证：需求 6.5、18.2**
  - [x] 4.4 为游客消息限制编写边界条件单元测试
    - **属性 11：游客消息数量限制（边界条件）**
    - **验证：需求 6.6**
  - _需求：6.1、6.5、6.6、18.2_


- [x] 5. 后端：学习进度与每日课堂 API
  - [x] 5.1 新增 `handleLearningProgress`（GET/POST `/api/learning/progress`）：GET 返回用户所有模块进度；POST 更新 `learning_progress` 表中指定模块的 `status`，并重新计算 `users.learning_pct`（已完成模块数 / 总模块数）
  - [x] 5.2 新增 `handleDailyLesson`（GET `/api/learning/daily-lesson`）：按当天日期对 60 取模得到 `day_index`，返回对应课堂内容；新增 `handleMarkLessonRead`（POST `/api/learning/daily-lesson/read`）：写入 `lesson_reads` 表并触发学习进度更新
  - _需求：16.1、16.2、16.3、16.4、18.3_

- [x] 6. 后端：热门股票与板块热点 API
  - [x] 6.1 新增 `handleHotStocks`（GET `/api/market/hot-stocks`）：从 `stock_bars` 表查询最近两日收盘价计算涨跌幅，按涨跌幅降序返回前 10 只；使用内存缓存（`sync.Map` + 时间戳）实现 60 秒缓存，缓存命中时附加 `cached_at` 字段
  - [x] 6.2 新增 `handleSectors`（GET `/api/market/sectors`）：基于预定义板块-股票映射，聚合计算板块平均涨跌幅，返回前 5 个板块（含板块名、涨跌幅、龙头股）
  - _需求：15.1、15.2、15.3、15.4_

- [x] 7. 后端：模拟账户增强与资产分析 API
  - [x] 7.1 在 `handleTrade` 的卖出成功分支中，调用 `updateEquityHistory(userID, totalAssets)` 将当前总资产快照追加到 `portfolios.equity_history_json`（保留最近 90 天数据）
  - [x] 7.2 扩展 `handlePortfolio`，新增 `?range=7d|30d|all` 参数，从 `equity_history_json` 中截取对应时间段的净值历史返回；计算并返回 MDD、Sharpe、胜率三项指标
  - [x] 7.3 为资产计算不变量编写属性测试
    - **属性 19：资产计算不变量（total_assets = cash + Σ持仓市值）**
    - **验证：需求 9.1、9.2**
  - [x] 7.4 为手续费计算编写属性测试
    - **属性 17：手续费计算正确性（fee = amount × 0.0003）**
    - **验证：需求 8.6**
  - [x] 7.5 为涨跌停限制编写属性测试
    - **属性 15：涨跌停价格验证**
    - **验证：需求 8.3**
  - [x] 7.6 为 T+1 规则编写边界条件单元测试
    - **属性 16：T+1 规则执行（边界条件）**
    - **验证：需求 8.4、8.5**
  - [x] 7.7 为资金不足拒绝编写边界条件单元测试
    - **属性 18：资金不足拒绝（边界条件）**
    - **验证：需求 8.7**
  - _需求：8.3、8.4、8.5、8.6、8.7、9.1、9.2、9.3、9.5_


- [x] 8. 后端：交易记录筛选与用户注册增强
  - [x] 8.1 新增 `handleTrades`（GET `/api/trades`），支持 `?symbol=&action=&start=&end=` 筛选，从 `trades` 表查询并返回
  - [x] 8.2 在 `handleRegister` 中校验密码长度 >= 8，不满足返回 400；注册成功后同时初始化 `learning_progress` 基础模块记录
  - [x] 8.3 为交易记录持久化编写属性测试
    - **属性 20：交易记录持久化 Round-Trip**
    - **验证：需求 10.1、18.1**
  - [x] 8.4 为交易记录筛选编写属性测试
    - **属性 21：交易记录筛选正确性**
    - **验证：需求 10.2**
  - [x] 8.5 为密码安全存储编写属性测试
    - **属性 22：密码安全存储（bcrypt 哈希，不明文）**
    - **验证：需求 11.1、11.2**
  - [x] 8.6 为 JWT 有效期编写属性测试
    - **属性 23：JWT Token 有效期（24h / 7d ±60s）**
    - **验证：需求 11.3**
  - [x] 8.7 为重复邮箱注册编写边界条件单元测试
    - **属性 24：重复邮箱注册拒绝（边界条件）**
    - **验证：需求 11.4**
  - [x] 8.8 为新用户初始资金编写属性测试
    - **属性 14：新用户初始资金 = 100,000 元**
    - **验证：需求 8.1**
  - _需求：8.1、10.1、10.2、11.1、11.2、11.3、11.4_

- [x] 9. 检查点 — 后端基础 API 验证
  - 确保所有后端单元测试和属性测试通过（`go test ./server/...`），向用户确认是否继续。


- [x] 10. AI 模块：选股引擎（`ai/screener.py`）
  - [x] 10.1 创建 `ai/screener.py`，实现 `StockScreener` 类：`screen(dimensions: list[str]) -> list[dict]`，从 `data/` 目录读取各股票特征文件，过滤掉 K 线数量 < 20 的股票，按趋势强度、资金净流入、板块热度、技术指标四个维度评分，返回最多 10 只候选股票（含 `symbol`、`name`、`reason`（<=50字）、`risk_level`（低/中/高）、`trend_score`、`capital_score`）
  - [x] 10.2 在 `ai/main.py` 中新增 `--mode screener` 分支，调用 `StockScreener.screen()` 并输出 JSON
  - [x] 10.3 在 `server/handlers.go` 中新增 `handleStockScreener`（GET `/api/ai/screener`），通过 `exec.Command` 调用 `ai.main --mode screener`，实现 API 失败时返回空列表降级
  - [x] 10.4 在 `server/routes.go` 中注册 `/api/ai/screener` 路由（需鉴权）
  - [x] 10.5 为选股结果完整性编写属性测试（hypothesis）
    - **属性 1：选股结果完整性（列表长度 <= 10，reason <= 50字，risk_level ∈ {低,中,高}）**
    - **验证：需求 4.1、4.3**
  - [x] 10.6 为选股数据不足排除编写边界条件单元测试
    - **属性 4：选股数据不足排除（K 线 < 20 时排除）**
    - **验证：需求 4.4**
  - _需求：4.1、4.3、4.4_

- [x] 11. AI 模块：复盘引擎（`ai/reviewer.py`）
  - [x] 11.1 创建 `ai/reviewer.py`，实现 `TradeReviewer` 类：`review_trade(trade: dict, klines: list) -> dict`（返回 `entry_timing`、`hold_duration`、`pnl_attribution`、`score`（1-5）、`suggestion`（<=100字））；`review_summary(trades: list, period: str) -> dict`（返回 `win_rate`、`avg_hold_days`、`max_profit`、`max_loss`、`common_patterns`、`diagnosis`）；两个方法均实现 API 失败降级
  - [x] 11.2 在 `ai/main.py` 中新增 `--mode review_trade` 和 `--mode review_summary` 分支
  - [x] 11.3 在 `server/handlers.go` 中新增 `handleReviewTrade`（GET `/api/ai/review/:trade_id`）和 `handleReviewSummary`（GET `/api/ai/review/summary?period=week|month`），通过 `exec.Command` 调用对应 Python 模式
  - [x] 11.4 在 `server/routes.go` 中注册复盘路由（需鉴权）
  - [x] 11.5 为复盘报告结构完整性编写属性测试（hypothesis）
    - **属性 12：复盘报告结构完整性（含三维度字段，score ∈ [1,5]，suggestion <= 100字）**
    - **验证：需求 7.1、7.2**
  - [x] 11.6 为综合复盘报告字段完整性编写属性测试（hypothesis）
    - **属性 13：综合复盘报告字段完整性（含五项指标，common_patterns 长度 >= 1）**
    - **验证：需求 7.3、7.4**
  - _需求：7.1、7.2、7.3、7.4、10.3、10.4_


- [x] 12. AI 模块：行情分析增强与对话上下文注入
  - [x] 12.1 扩展 `ai/advisor.py` 的 `generate_report()`，确保返回结构严格包含 `signal`（BUY/SELL/HOLD）、`confidence`（[0.0,1.0]）、`reason`（<=100字）、`risk`（<=50字）四个字段；API 失败时返回 `signal=HOLD`、`confidence=0.5` 的默认报告
  - [x] 12.2 扩展 `ai/chat.py` 的 `ask()` 方法：在 `context` 参数中强制注入当前股票代码和最新收盘价；截断 `history` 列表保留最近 20 条；在涉及高风险操作时在响应末尾追加免责声明
  - [x] 12.3 为 AI 分析报告结构约束编写属性测试（hypothesis）
    - **属性 2：AI 分析报告结构约束（四字段，signal ∈ {BUY,SELL,HOLD}，confidence ∈ [0,1]）**
    - **验证：需求 3.2**
  - [x] 12.4 为 API 失败默认报告编写边界条件单元测试
    - **属性 3：API 失败时返回 HOLD/0.5 默认报告**
    - **验证：需求 3.4**
  - [x] 12.5 为对话历史截断编写属性测试（hypothesis）
    - **属性 8：对话历史截断（传给模型的历史 <= 20 条）**
    - **验证：需求 6.1**
  - [x] 12.6 为对话上下文注入编写属性测试（hypothesis）
    - **属性 9：AI 对话上下文注入（context 包含股票代码和最新价格）**
    - **验证：需求 6.3**
  - _需求：3.2、3.4、6.1、6.3、6.4、14.1、14.5_

- [x] 13. AI 模块：回测引擎增强
  - [x] 13.1 扩展 `backtest.py`，新增 `run_backtest(symbol, strategy, params, start_date, end_date) -> BacktestReport` 函数，支持 `ma_cross`（MA5/MA20 金叉死叉）和 `macd_zero`（MACD 零轴穿越）两种策略；校验有效交易日 < 30 时抛出 `ValueError`；返回包含 `annual_return`、`max_drawdown`、`win_rate`、`sharpe`、`curve`、`signals` 的 JSON 结构
  - [x] 13.2 在 `server/handlers.go` 中新增 `handleBacktestCustom`（POST `/api/backtest/custom`），调用 `backtest.py`，将结果存入 `backtest_reports` 表，并返回 JSON 报告
  - [x] 13.3 在 `server/routes.go` 中注册 `/api/backtest/custom` 路由（需鉴权）
  - [x] 13.4 为回测报告字段完整性编写属性测试（hypothesis）
    - **属性 5：回测报告字段完整性（含五项指标和 curve）**
    - **验证：需求 5.2**
  - [x] 13.5 为回测结果 JSON Round-Trip 编写属性测试（hypothesis）
    - **属性 6：回测结果 JSON 序列化 Round-Trip（数值误差 < 1e-9）**
    - **验证：需求 19.4**
  - [x] 13.6 为回测数据不足错误处理编写边界条件单元测试
    - **属性 7：回测数据不足时返回错误（有效交易日 < 30）**
    - **验证：需求 5.4、5.5**
  - _需求：5.1、5.2、5.3、5.4、5.5、5.6_

- [x] 14. 检查点 — AI 模块验证
  - 确保所有 Python 属性测试和单元测试通过（`pytest ai/tests/ --tb=short`），向用户确认是否继续。


- [x] 15. 前端：知识库工具函数与术语识别
  - [x] 15.1 创建 `frontend/src/lib/knowledgeBase.js`：内置不少于 200 个股票专业术语的标准解释数组（含 `term`、`definition`（<=80字）、`usage`、`related_terms` 字段）；实现 `identifyTerms(text: string) -> Array<{term, start, end}>` 函数，扫描文本中的已知术语并返回位置信息
  - [x] 15.2 实现 `queryTerm(term: string) -> {definition, usage, related_terms}` 函数，查询不到时返回 null
  - [x] 15.3 为术语识别正确性编写属性测试（vitest + fast-check）
    - **属性 26：术语识别正确性（返回术语在文本中的起始/结束索引）**
    - **验证：需求 2.2**
  - [x] 15.4 为术语查询完整性编写属性测试（vitest + fast-check）
    - **属性 27：术语查询完整性（返回 definition、usage、related_terms 三字段）**
    - **验证：需求 2.3**
  - _需求：2.1、2.2、2.3、17.1_

- [x] 16. 前端：TermTooltip 专业名词悬浮解释组件
  - [x] 16.1 创建 `frontend/src/components/TermTooltip.jsx`：接收 `text` prop，使用 `identifyTerms()` 自动识别并高亮术语；鼠标悬停 500ms 后展示解释卡片（含定义和"查看详情"链接）；移动端改为点击触发
  - [x] 16.2 在 `TradingChart.jsx` 的 AI 报告展示区域和 `ChatTerminal.jsx` 的响应文本中引入 `TermTooltip`
  - _需求：2.2、2.3、17.1、17.2、17.3、17.4_

- [x] 17. 前端：RiskGuard 风险提示组件
  - [x] 17.1 创建 `frontend/src/components/RiskGuard.jsx`：实现 `useRiskGuard(portfolio, tradeAmount)` hook，当单笔买入金额 > 总资产 30% 时返回集中持仓警告；当持仓浮亏 > 10% 时返回止损提示；在 `TradePanel.jsx` 中引入该 hook，触发时弹出确认对话框
  - [x] 17.2 在 `App.jsx` 中实现首次使用模拟交易时展示一次性风险教育弹窗（使用 `localStorage` 记录已确认状态）
  - _需求：14.1、14.2、14.3、14.4、14.5_


- [x] 18. 前端：NoteEditor 笔记编辑器组件
  - [x] 18.1 创建 `frontend/src/components/NoteEditor.jsx`：支持创建、编辑、删除笔记；实时字数统计（上限 2000 字，超出禁用保存按钮）；自动关联当前股票代码；调用 `/api/notes` CRUD 接口；未登录时展示登录提示
  - _需求：13.1、13.2、13.3、13.4、13.5_

- [x] 19. 前端：WatchList 自选股管理组件
  - [x] 19.1 创建 `frontend/src/components/WatchList.jsx`：展示自选股列表（含代码、名称、最新涨跌幅）；支持添加（最多 50 只，超出提示）和删除；点击股票跳转至行情页；调用 `/api/watchlist` 接口
  - _需求：12.2、15.3_

- [x] 20. 前端：PortfolioChart 净值曲线图组件
  - [x] 20.1 创建 `frontend/src/components/PortfolioChart.jsx`：使用 `lightweight-charts` 绘制账户净值曲线；支持近 7 日、近 30 日、全部历史三个时间范围切换；叠加显示基准（000001 平安银行）涨跌幅曲线；展示 MDD、Sharpe、胜率三项指标
  - [x] 20.2 在 `DataTabs.jsx` 中新增"净值曲线"标签页，引入 `PortfolioChart`
  - _需求：9.3、9.4、9.5、9.6_

- [x] 21. 前端：StockScreener AI 选股面板组件
  - [x] 21.1 创建 `frontend/src/components/StockScreener.jsx`：提供趋势强度、资金净流入、板块热度、技术指标四个维度的多选筛选器；调用 `/api/ai/screener`；展示候选股票列表（含理由和风险等级）；点击股票切换主图标的
  - [x] 21.2 在 `Dashboard` 中新增"AI 选股"入口按钮，点击展示 `StockScreener` 面板
  - _需求：4.1、4.2、4.3_

- [x] 22. 前端：ReviewReport AI 复盘报告组件
  - [x] 22.1 创建 `frontend/src/components/ReviewReport.jsx`：展示单笔交易复盘报告（入场时机、持仓时长、盈亏归因、评分、改进建议）；展示阶段性综合诊断报告（胜率、平均持股时间、最大盈亏、常见错误模式）；调用 `/api/ai/review/:trade_id` 和 `/api/ai/review/summary`
  - [x] 22.2 在 `DataTabs.jsx` 的交易记录列表中，每笔卖出记录后添加"AI 复盘"按钮，点击展示 `ReviewReport`
  - _需求：7.1、7.2、7.3、7.4_


- [x] 23. 前端：学习中心页面（LearningCenter、KnowledgeModule、KLineReplay、DailyLesson）
  - [x] 23.1 创建 `frontend/src/pages/LearningCenter.jsx`：作为学习中心主页面，包含技术指标模块（K 线、均线、量价关系、MACD、KDJ 五类）、基本面模块、交易规则模块三个标签页；每类指标包含图文讲解和可交互动画示例
  - [x] 23.2 创建 `frontend/src/components/KnowledgeModule.jsx`：展示单个知识模块的图文内容；点击指标名称时在 300ms 内展示悬浮解释卡片（复用 `TermTooltip`）；提供不少于 10 个典型 K 线形态教学案例
  - [x] 23.3 创建 `frontend/src/components/KLineReplay.jsx`：基于 `lightweight-charts` 实现 K 线历史回放；支持 1x/2x/4x 倍速快进和逐帧后退；调用 `/api/indicators` 获取历史数据
  - [x] 23.4 创建 `frontend/src/components/DailyLesson.jsx`：调用 `/api/learning/daily-lesson` 展示今日课堂卡片；提供"了解更多"跳转；已登录用户阅读后调用 `/api/learning/daily-lesson/read` 标记已读
  - [x] 23.5 在 `App.jsx` 中新增"学习中心"导航入口，切换至 `LearningCenter` 页面
  - _需求：1.1、1.2、1.3、1.4、1.5、1.6、16.1、16.3、16.4_

- [x] 24. 前端：个人中心页面（PersonalCenter、ChatHistory）
  - [x] 24.1 创建 `frontend/src/pages/PersonalCenter.jsx`：展示账户总资产、累计收益率、注册时间、学习完成进度四项概览；集成 `WatchList`、`NoteEditor`（笔记列表）、对话历史三个标签页
  - [x] 24.2 在个人中心的对话历史标签页中，调用 `/api/chat-history?date=` 展示历史记录（支持日期筛选，最多 100 条）
  - [x] 24.3 在 `App.jsx` 中新增"个人中心"导航入口（用户已登录时显示），切换至 `PersonalCenter` 页面
  - _需求：12.1、12.3、12.4、12.5_

- [x] 25. 前端：热门股票与板块热点展示
  - [x] 25.1 在 `Dashboard` 的板块热图区域（`activeCards.heatmap`）中，将现有静态数据替换为调用 `/api/market/sectors` 的真实数据；在首页新增热门股票列表区域，调用 `/api/market/hot-stocks`，每 60 秒自动刷新
  - _需求：15.1、15.2、15.3、15.4_

- [x] 26. 前端：AI 对话助手增强（ChatTerminal）
  - [x] 26.1 扩展 `frontend/src/components/ChatTerminal.jsx`：在发送消息时将当前股票最新收盘价注入 `context` 字段；在本地维护会话消息计数，游客达到 5 条时展示注册引导提示；会话结束（组件卸载）时调用 `/api/chat-history` 批量保存对话记录
  - _需求：6.1、6.2、6.3、6.4、6.5、6.6、2.4、2.5_

- [x] 27. 检查点 — 前端组件集成验证
  - 确保所有前端单元测试和属性测试通过（`cd frontend && npx vitest --run`），向用户确认是否继续。


- [x] 28. 后端：自定义回测参数验证（可选高级功能）
  - [x] 28.1 在 `handleBacktestCustom` 中添加参数校验：均线周期不在 [5, 120] 范围、止损比例不在 [0.01, 0.20] 范围、止盈比例不在 [0.01, 0.50] 范围时返回 400 错误
  - [x] 28.2 为自定义回测参数验证编写属性测试（rapid）
    - **属性 28：自定义回测参数验证（越界参数返回 400）**
    - **验证：需求 19.1、19.2**
  - _需求：19.1、19.2、19.3_

- [x] 29. 前端：排行榜页面（可选高级功能）
  - [x] 29.1 创建 `frontend/src/pages/Leaderboard.jsx`：调用 `/api/leaderboard` 展示按总收益率降序的用户排行榜（每页 20 条，支持翻页）；调用 `/api/leaderboard/me` 展示当前用户排名、收益率、最大回撤；`is_public=0` 的用户以匿名方式展示
  - [x] 29.2 在 `server/handlers.go` 中新增 `handleLeaderboard`（GET `/api/leaderboard`）和 `handleLeaderboardMe`（GET `/api/leaderboard/me`）：从 `portfolios` 表计算收益率排名，`is_public=0` 的用户名替换为"匿名用户"
  - [x] 29.3 在 `server/routes.go` 中注册排行榜路由（`/api/leaderboard` 公开，`/api/leaderboard/me` 需鉴权）
  - [x] 29.4 在 `App.jsx` 中新增"排行榜"导航入口
  - _需求：20.1、20.2、20.3、20.4_

- [x] 30. 最终检查点 — 全量测试通过
  - 确保所有测试通过（`go test ./server/...`、`pytest ai/tests/ --tb=short`、`cd frontend && npx vitest --run`），向用户确认功能完整性。

## 备注

- 标记 `*` 的任务为可选任务（测试子任务或可选高级功能），可跳过以加快 MVP 交付
- 任务 28-29 对应需求 19-20（可选高级功能），整体可跳过
- 每个任务均引用了具体需求条款，便于追溯
- 属性测试验证普遍性质，单元测试验证具体示例和边界条件，两者互补
