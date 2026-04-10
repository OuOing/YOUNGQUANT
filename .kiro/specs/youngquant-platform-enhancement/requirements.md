# 需求文档

## 简介

YoungQuant 是一个面向股票投资初学者到进阶用户的 AI 量化模拟交易学习平台。本次功能增强旨在将现有的基础模拟交易系统升级为一个完整的"学习 → 实战 → 复盘"闭环平台，核心差异化在于 AI 驱动的行情分析、智能选股、量化策略可视化以及个性化学习路径。

现有技术栈：React + Vite + Tailwind CSS（前端）、Go/Gin（后端）、Python（AI 模块）、SQLite（数据库）。

---

## 词汇表

- **Platform**：YoungQuant 平台整体系统
- **Learning_Module**：股票基础知识学习子系统
- **Knowledge_Base**：内置股票专业知识库
- **AI_Advisor**：AI 行情分析与选股智能体（现有 `ai/advisor.py` 的扩展）
- **AI_Chat**：AI 对话助手（现有 `ai/chat.py` 的扩展）
- **Simulation_Engine**：模拟交易撮合引擎（现有 `server/handlers.go` 中 `handleTrade` 的扩展）
- **Portfolio_Analyzer**：资产分析与行为统计子系统
- **User_System**：用户注册、登录、个人中心子系统
- **Backtest_Engine**：量化策略回测引擎（现有 `backtest.py` 的扩展）
- **Note_System**：轻量笔记子系统
- **Risk_Guard**：风险提示子系统
- **Guest_User**：未登录的游客用户
- **Registered_User**：已完成注册并登录的用户
- **Simulation_Account**：模拟炒股账户，初始资金 100,000 元人民币
- **T+1**：中国 A 股交易规则，当日买入的股票次日方可卖出
- **EARS**：Easy Approach to Requirements Syntax，需求语法规范

---

## 需求

### 需求 1：股票基础知识体系

**用户故事：** 作为股票初学者，我希望通过图文和动画学习 K 线、均线、MACD 等技术指标及基本面知识，以便系统地建立投资基础。

#### 验收标准

1. THE Learning_Module SHALL 提供涵盖 K 线、均线、量价关系、MACD、KDJ 五类技术指标的图文讲解页面，每类指标包含至少一个可交互的动画示例。
2. THE Learning_Module SHALL 提供基本面知识模块，内容包括市盈率（PE）、市净率（PB）、营收增长率、财报解读四个主题。
3. THE Learning_Module SHALL 提供交易规则模块，内容包括 T+1 规则、涨跌停限制（±10%）、集合竞价机制、龙虎榜解读四个主题。
4. WHEN 用户点击知识模块中的任意技术指标名称，THE Learning_Module SHALL 在 300ms 内展示该指标的悬浮解释卡片。
5. THE Learning_Module SHALL 提供历史 K 线回放功能，支持用户以 1 倍、2 倍、4 倍速度快进，以及逐帧后退。
6. THE Learning_Module SHALL 提供不少于 10 个典型 K 线形态教学案例（如头肩顶、双底、旗形整理等），每个案例包含形态标注和结果说明。

---

### 需求 2：智能知识点问答

**用户故事：** 作为学习中的用户，我希望能用自然语言提问股票专业词汇，以便随时获得准确解释而不必离开平台。

#### 验收标准

1. THE Knowledge_Base SHALL 内置不少于 200 个股票专业术语的标准解释。
2. WHEN 用户在任意页面输入包含已收录专业术语的文本，THE Knowledge_Base SHALL 在 500ms 内自动识别并高亮该术语。
3. WHEN 用户点击被高亮的专业术语，THE Knowledge_Base SHALL 展示该术语的定义、使用场景及相关术语链接。
4. WHEN 用户通过自然语言提问（如"什么是金叉"），THE AI_Chat SHALL 结合 Knowledge_Base 返回准确解释，响应时间不超过 5 秒。
5. IF 用户提问的术语不在 Knowledge_Base 中，THEN THE AI_Chat SHALL 通过 AI 模型生成解释，并提示用户该解释由 AI 生成。

---

### 需求 3：AI 行情分析

**用户故事：** 作为模拟交易用户，我希望 AI 自动解读当前股票的 K 线形态、趋势和资金流向，以便辅助我做出交易决策。

#### 验收标准

1. WHEN Registered_User 请求 AI 行情分析，THE AI_Advisor SHALL 基于最近 20 根 K 线数据生成包含形态识别、趋势判断、资金流向三个维度的分析报告。
2. THE AI_Advisor SHALL 在分析报告中输出信号（BUY / SELL / HOLD）、置信度（0.0 到 1.0）、分析摘要（不超过 100 字）、主要风险点（不超过 50 字）。
3. WHEN AI_Advisor 生成分析报告，THE Platform SHALL 在 K 线图上标注对应的买卖信号点位。
4. IF AI_Advisor 调用外部 API 失败，THEN THE AI_Advisor SHALL 返回信号为 HOLD、置信度为 0.5 的默认报告，并说明原因。
5. THE AI_Advisor SHALL 支持日线（daily）和 15 分钟线（15m）两种周期的分析。

---

### 需求 4：AI 选股与智能盯盘

**用户故事：** 作为进阶用户，我希望 AI 能按照趋势、资金、热点、技术面等维度筛选股票，以便发现潜在机会。

#### 验收标准

1. THE AI_Advisor SHALL 提供选股功能，支持按趋势强度、资金净流入、板块热度、技术指标四个维度进行筛选，每次返回不超过 10 只候选股票。
2. WHEN Registered_User 开启智能盯盘，THE AI_Advisor SHALL 每隔 60 秒对用户持仓股票重新评估信号，并在信号变化时推送提示。
3. THE AI_Advisor SHALL 对每只候选股票提供简要理由（不超过 50 字）和风险等级（低 / 中 / 高）。
4. IF 候选股票数据不足（少于 20 根 K 线），THEN THE AI_Advisor SHALL 将该股票从候选列表中排除，并记录排除原因。

---

### 需求 5：AI 量化策略可视化

**用户故事：** 作为量化学习者，我希望直观看到均线金叉死叉、MACD 策略的回测结果，以便理解量化策略的逻辑和效果。

#### 验收标准

1. THE Backtest_Engine SHALL 支持均线金叉死叉（MA5/MA20）和 MACD 零轴穿越两种内置策略的回测。
2. WHEN Registered_User 运行回测，THE Backtest_Engine SHALL 在 30 秒内返回包含策略净值曲线、基准（持有不动）净值曲线、最大回撤、年化收益率、胜率五项指标的回测报告。
3. THE Platform SHALL 在 K 线图上叠加显示回测策略的买卖信号点位，买入点用红色标记，卖出点用绿色标记。
4. THE Backtest_Engine SHALL 支持用户自定义回测时间范围，最短 30 个交易日，最长为数据库中全部可用数据。
5. IF 回测时间范围内有效数据少于 30 个交易日，THEN THE Backtest_Engine SHALL 返回错误提示，说明数据不足。
6. THE Backtest_Engine SHALL 提供回测结果的 CSV 格式导出功能。

---

### 需求 6：AI 对话助手（股票专属）

**用户故事：** 作为平台用户，我希望与 AI 助手进行多轮对话，获取行情解读、策略咨询和风险提示，以便在学习和交易中获得即时支持。

#### 验收标准

1. THE AI_Chat SHALL 支持多轮上下文对话，在同一会话中保留最近 20 条对话历史。
2. WHEN 用户发送消息，THE AI_Chat SHALL 在 10 秒内返回响应。
3. THE AI_Chat SHALL 在每次响应中自动注入当前股票的最新行情数据（最新收盘价、涨跌幅、成交量）作为上下文。
4. THE AI_Chat SHALL 在涉及高风险操作建议时，自动附加风险提示声明（"以上内容仅供学习参考，不构成投资建议"）。
5. WHEN Registered_User 结束会话，THE AI_Chat SHALL 将对话历史持久化存储到数据库，供用户在个人中心查看。
6. IF Guest_User 使用 AI_Chat，THEN THE Platform SHALL 限制单次会话最多 5 条消息，并引导用户注册以解锁完整功能。

---

### 需求 7：AI 模拟操盘复盘

**用户故事：** 作为模拟交易用户，我希望在完成一次模拟交易后，AI 能自动复盘并指出操作中的问题，以便提升交易技能。

#### 验收标准

1. WHEN Registered_User 完成一笔卖出交易，THE AI_Advisor SHALL 自动生成该笔交易的复盘报告，包含入场时机评估、持仓时长分析、盈亏归因三个维度。
2. THE AI_Advisor SHALL 在复盘报告中给出 1 到 5 分的操作评分，并提供不超过 100 字的改进建议。
3. WHEN Registered_User 请求生成阶段性复盘（周报/月报），THE AI_Advisor SHALL 基于该时间段内的全部交易记录生成综合诊断报告。
4. THE AI_Advisor SHALL 在综合诊断报告中统计胜率、平均持股时间、最大单笔盈亏、最常见错误模式四项指标。

---

### 需求 8：模拟炒股账户

**用户故事：** 作为平台用户，我希望拥有一个模拟炒股账户，使用实时行情进行限价和市价买卖练习，以便在零风险环境中积累交易经验。

#### 验收标准

1. WHEN 新用户完成注册，THE Simulation_Engine SHALL 为该用户创建初始资金为 100,000 元人民币的 Simulation_Account。
2. THE Simulation_Engine SHALL 支持限价单和市价单两种委托类型。
3. WHEN 用户提交买入委托，THE Simulation_Engine SHALL 验证委托价格不超过前收盘价的 110%（涨停限制），且不低于前收盘价的 90%（跌停限制）。
4. THE Simulation_Engine SHALL 按照 T+1 规则执行，当日买入的股票在次日方可卖出。
5. WHEN 用户提交卖出委托，THE Simulation_Engine SHALL 验证可卖数量不超过 T+1 规则下的可用持仓。
6. THE Simulation_Engine SHALL 按照成交金额的 0.03% 计算交易手续费，并从账户余额中扣除。
7. IF 用户账户余额不足以支付买入金额及手续费，THEN THE Simulation_Engine SHALL 拒绝委托并返回"资金不足"错误。
8. THE Simulation_Engine SHALL 支持 Guest_User 使用游客模式进行模拟交易，游客数据仅在当前会话中保留。

---

### 需求 9：资产分析面板

**用户故事：** 作为模拟交易用户，我希望实时查看总资产、持仓盈亏、收益率曲线，并与大盘进行对比，以便评估自己的交易表现。

#### 验收标准

1. THE Portfolio_Analyzer SHALL 实时展示总资产、可用现金、持仓市值、总盈亏金额、总盈亏百分比五项核心指标。
2. THE Portfolio_Analyzer SHALL 展示每只持仓股票的成本价、现价、持仓数量、浮动盈亏金额、浮动盈亏百分比。
3. THE Portfolio_Analyzer SHALL 提供账户净值曲线图，时间范围支持近 7 日、近 30 日、全部历史三个选项。
4. THE Portfolio_Analyzer SHALL 在净值曲线图上叠加显示同期沪深 300 指数（或平安银行 000001 作为基准）的涨跌幅，用于对比。
5. THE Portfolio_Analyzer SHALL 展示最大回撤（MDD）、夏普比率（Sharpe）、胜率三项风险收益指标。
6. WHEN 用户切换持仓周期视图（1 小时 / 1 日），THE Portfolio_Analyzer SHALL 在 1 秒内更新对应时间段的盈亏数据。

---

### 需求 10：操作记录与行为分析

**用户故事：** 作为注册用户，我希望查看完整的交易记录，并由 AI 生成交易行为诊断报告，以便了解自己的交易习惯和改进方向。

#### 验收标准

1. THE Portfolio_Analyzer SHALL 记录每笔交易的日期时间、股票代码、股票名称、操作方向（买入/卖出）、成交价格、成交数量、手续费。
2. THE Portfolio_Analyzer SHALL 支持按时间范围、股票代码、操作方向对交易记录进行筛选。
3. WHEN Registered_User 请求生成交易诊断报告，THE AI_Advisor SHALL 统计胜率、平均持股时间（天）、平均盈利幅度、平均亏损幅度四项指标。
4. THE AI_Advisor SHALL 在交易诊断报告中识别用户最常见的 3 种交易行为模式（如"追涨杀跌"、"过早止盈"等），并给出针对性建议。

---

### 需求 11：用户注册与登录

**用户故事：** 作为新用户，我希望通过账号密码或手机号注册登录，以便保存我的学习进度和交易数据。

#### 验收标准

1. THE User_System SHALL 支持通过邮箱/账号 + 密码方式注册，密码长度不少于 8 位。
2. THE User_System SHALL 在注册时对密码进行 bcrypt 哈希处理后存储，不得明文存储密码。
3. WHEN 用户登录成功，THE User_System SHALL 签发有效期为 24 小时的 JWT Token；勾选"记住我"时有效期延长至 7 天。
4. IF 用户提交的邮箱已被注册，THEN THE User_System SHALL 返回"用户已存在"错误，不创建重复账户。
5. THE User_System SHALL 支持 Guest_User 以游客模式访问平台核心功能，游客模式下 AI 对话限制为每次会话 5 条消息。
6. WHEN JWT Token 过期，THE User_System SHALL 返回 401 状态码，前端引导用户重新登录。

---

### 需求 12：个人中心

**用户故事：** 作为注册用户，我希望在个人中心查看我的资产概览、关注股票、学习进度和历史笔记，以便全面掌握自己在平台上的状态。

#### 验收标准

1. THE User_System SHALL 在个人中心展示账户总资产、累计收益率、注册时间、学习完成进度百分比四项概览信息。
2. THE User_System SHALL 支持用户维护自选股列表，最多添加 50 只股票，支持增加和删除操作。
3. THE User_System SHALL 记录用户的学习进度，以模块为单位标记"未开始 / 进行中 / 已完成"三种状态。
4. THE User_System SHALL 在个人中心展示用户的 AI 对话历史，支持按日期筛选，最多展示最近 100 条记录。
5. THE User_System SHALL 在个人中心展示用户保存的笔记列表，支持查看和删除操作。

---

### 需求 13：轻量笔记功能

**用户故事：** 作为学习用户，我希望在学习或交易过程中随时记录笔记，以便保存心得和复盘思路。

#### 验收标准

1. THE Note_System SHALL 支持 Registered_User 在任意页面通过快捷入口创建笔记，笔记内容长度不超过 2,000 字。
2. THE Note_System SHALL 自动将笔记与当前股票代码和时间戳关联存储。
3. THE Note_System SHALL 支持对笔记进行查看、编辑、删除操作。
4. WHEN 用户保存笔记，THE Note_System SHALL 在 1 秒内完成持久化存储并给出成功提示。
5. IF 用户未登录，THEN THE Note_System SHALL 提示用户登录后方可保存笔记。

---

### 需求 14：风险提示系统

**用户故事：** 作为平台用户，我希望在进行高风险操作或接收 AI 建议时看到明确的风险提示，以便建立正确的投资风险意识。

#### 验收标准

1. THE Risk_Guard SHALL 在每次 AI 生成买卖信号时，在信号旁展示"以上内容仅供学习参考，不构成投资建议"的免责声明。
2. WHEN 用户单笔买入金额超过账户总资产的 30%，THE Risk_Guard SHALL 弹出确认对话框，提示集中持仓风险。
3. WHEN 用户持仓浮亏超过买入成本的 10%，THE Risk_Guard SHALL 在持仓列表中以醒目颜色标注该持仓，并展示止损提示。
4. THE Risk_Guard SHALL 在用户首次使用模拟交易功能时，展示一次性的风险教育弹窗，用户确认后方可继续操作。
5. THE Risk_Guard SHALL 在 AI 对话中识别用户表达的高风险意图（如"全仓买入"、"加杠杆"），并自动附加风险警示。

---

### 需求 15：热门股票与板块热点

**用户故事：** 作为平台用户，我希望快速了解当前市场热门股票和活跃板块，以便把握市场热点。

#### 验收标准

1. THE Platform SHALL 在首页展示热门股票列表，包含股票代码、名称、最新涨跌幅，数据每 60 秒刷新一次。
2. THE Platform SHALL 展示板块热度排行，按涨跌幅排序展示不少于 5 个板块，每个板块显示板块名称、涨跌幅、龙头股。
3. WHEN 用户点击热门股票，THE Platform SHALL 跳转至该股票的行情分析页面。
4. IF 行情数据源不可用，THEN THE Platform SHALL 展示最近一次缓存的热门数据，并标注数据更新时间。

---

### 需求 16：每日投资小课堂

**用户故事：** 作为学习用户，我希望每天看到一条投资知识推送，以便持续积累投资知识。

#### 验收标准

1. THE Learning_Module SHALL 每日推送一条投资知识卡片，内容涵盖技术分析、基本面分析、交易心理、风险管理四个类别。
2. THE Learning_Module SHALL 维护不少于 60 条知识卡片内容，按日期轮播，避免 60 天内重复。
3. WHEN 用户点击知识卡片的"了解更多"，THE Learning_Module SHALL 跳转至对应的详细知识模块页面。
4. WHEN Registered_User 阅读完一条知识卡片，THE Learning_Module SHALL 记录该用户的阅读状态，并更新学习进度。

---

### 需求 17：专业名词悬浮解释

**用户故事：** 作为初学者，我希望在浏览行情数据和 AI 报告时，鼠标悬停在专业名词上即可看到解释，以便降低学习门槛。

#### 验收标准

1. THE Platform SHALL 对行情页面、AI 报告、学习模块中出现的专业名词（如 MACD、RSI、夏普比率等）添加悬浮解释标记。
2. WHEN 用户鼠标悬停在带标记的专业名词上超过 500ms，THE Platform SHALL 展示该名词的简短解释（不超过 80 字）。
3. THE Platform SHALL 在悬浮解释卡片中提供"查看详情"链接，点击后跳转至 Knowledge_Base 对应条目。
4. THE Platform SHALL 在移动端将悬浮解释改为点击触发，点击名词后展示解释卡片。

---

### 需求 18：数据持久化与操作记录

**用户故事：** 作为注册用户，我希望我的持仓、委托、成交、AI 对话历史和学习行为都被完整记录，以便随时查看历史数据。

#### 验收标准

1. THE Platform SHALL 将每笔成交记录（含日期时间、股票代码、方向、价格、数量、手续费）持久化存储到 SQLite 数据库。
2. THE Platform SHALL 将每次 AI 对话（含用户消息、AI 响应、时间戳、关联股票代码）持久化存储到数据库。
3. THE Platform SHALL 将用户的学习行为（含模块名称、完成时间、阅读时长）持久化存储到数据库。
4. THE Platform SHALL 将用户的自选股列表持久化存储，跨设备登录后数据保持一致。
5. IF 数据库写入操作失败，THEN THE Platform SHALL 记录错误日志，并向用户返回操作失败提示，不丢失用户已提交的数据。

---

### 需求 19：简单策略回测工具（可选高级功能）

**用户故事：** 作为量化学习者，我希望自定义简单的量化策略参数并运行回测，以便验证策略有效性。

#### 验收标准

1. WHERE 用户启用高级回测功能，THE Backtest_Engine SHALL 支持用户自定义均线周期（5 到 120 日）、MACD 参数（快线、慢线、信号线）进行回测。
2. WHERE 用户启用高级回测功能，THE Backtest_Engine SHALL 支持用户设置止损比例（1% 到 20%）和止盈比例（1% 到 50%）。
3. WHEN 用户提交自定义回测参数，THE Backtest_Engine SHALL 在 60 秒内返回回测结果。
4. THE Backtest_Engine SHALL 对回测结果进行解析，生成可读的 JSON 格式报告，并支持打印为格式化文本（round-trip 属性：解析后打印再解析，结果等价）。

---

### 需求 20：模拟盘收益率排行榜（可选高级功能）

**用户故事：** 作为竞技型用户，我希望看到平台上所有用户的模拟盘收益率排行，以便激励自己提升交易水平。

#### 验收标准

1. WHERE 用户启用排行榜功能，THE Platform SHALL 展示按总收益率降序排列的用户排行榜，每页显示 20 条记录。
2. WHERE 用户启用排行榜功能，THE Platform SHALL 展示当前登录用户的排名、总收益率、最大回撤三项数据。
3. THE Platform SHALL 每小时更新一次排行榜数据。
4. IF 用户选择不公开收益数据，THEN THE Platform SHALL 在排行榜中隐藏该用户的真实姓名，以匿名方式展示。
