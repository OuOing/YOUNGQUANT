# 内测准备任务清单

## 目标
确保新用户从落地页到完成第一笔交易的完整体验闭环，修复所有影响体验的问题。

## 优先级 P0 — 核心体验闭环（必须完成）

- [x] T1: 修复 StrategyPage 回测结果 — 添加净值曲线图表
- [x] T2: 修复空状态体验 — MarketPage/Leaderboard/PersonalCenter 空数据时的引导
- [x] T3: 移动端底部导航栏 — 手机用户无法访问各页面
- [x] T4: 新用户首次交易引导 — 注册后第一次进入 Dashboard 的提示
- [x] T5: LearningCenter KLineReplay 加载失败时的 fallback 内容
- [x] T6: 修复 TradePanel 中 onRefresh 未定义的 bug（OrderList 组件）

## 优先级 P1 — 体验提升（强烈建议）

- [x] T7: Dashboard 首屏优化 — 默认展开更多有用卡片，减少空白
- [x] T8: 个人中心学习进度 — 显示具体完成了哪些模块
- [x] T9: LearningCenter 基本面/交易规则内容卡片化，更易读
- [x] T10: ChatTerminal 游客限制提示优化 — 更友好的注册引导

## 优先级 P2 — 内容丰富（时间允许）

- [x] T11: MarketPage 添加刷新按钮和最后更新时间
- [x] T12: 错误边界组件 — 防止白屏
