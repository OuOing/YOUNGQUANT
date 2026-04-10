import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

const TOUR_STEPS = [
  // ── 仪表盘卡片级介绍 ──
  {
    target: 'chart-zone',
    cardId: 'chart',
    page: 'dashboard',
    layout: 'spotlight',
    bubbleSide: 'bottom',
    title: 'K线图 · 实时行情',
    subtitle: '01 / 主交易图表',
    content: '核心 K 线图区域，显示股票实时价格走势。叠加 MA5（黄线）和 MA20（紫线）均线，底部显示 RSI、MACD 等技术指标实时数值。',
    highlights: ['日K / 15分钟 两个周期切换', 'MA5 黄线：短期趋势', 'MA20 紫线：中期趋势', '顶部：最新价、涨跌幅、开高低量'],
  },
  {
    target: 'ai-zone',
    cardId: 'ai',
    page: 'dashboard',
    layout: 'spotlight',
    bubbleSide: 'left',
    title: 'YoungQuant V1 · AI 对话',
    subtitle: '02 / AI 智能助手',
    content: '基于 YoungQuant V1 模型的 AI 对话助手，自动注入当前股票的最新价格和技术指标。可以回答行情分析、技术指标解读、策略建议等问题。',
    highlights: ['直接输入问题，AI 实时回答', '点击快捷问题快速提问', '点击「生成研报」获取完整分析', '游客免费 5 条，登录后无限制'],
  },
  {
    target: 'assets-zone',
    cardId: 'assets',
    page: 'dashboard',
    layout: 'spotlight',
    bubbleSide: 'left',
    title: '资产净值 · 模拟账户',
    subtitle: '03 / 投资组合',
    content: '展示模拟账户总资产、可用现金、持仓市值、累计盈亏。注册时可选择 1万/10万/50万/100万 初始本金，遵循 A 股真实规则。',
    highlights: ['总资产 = 现金 + 持仓市值', '累计收益率基于初始本金计算', '持仓胜率和最大回撤实时更新', '净值曲线记录每次卖出后的快照'],
  },
  {
    target: 'trade-zone',
    cardId: 'trade',
    page: 'dashboard',
    layout: 'spotlight',
    bubbleSide: 'left',
    title: '交易台 · 模拟下单',
    subtitle: '04 / 买卖操作',
    content: '支持市价单（立即成交）和限价单（设定目标价格等待成交）。限价单预冻结资金，撤单后自动归还。遵循 T+1 规则。',
    highlights: ['市价单：立即以当前价成交', '限价单：设定价格等待触及', '挂单列表：查看和撤销待成交订单', 'T+1：当日买入次日才能卖出'],
  },
  // ── 页面级介绍（底部信息条）──
  {
    target: null,
    page: 'learning',
    layout: 'banner',      // banner = 底部全宽信息条，背景不虚化
    title: '学习中心',
    subtitle: '05 / 系统课程',
    content: '结构化学习路径，覆盖技术分析、基本面分析、交易规则三大模块。80+ 个知识点，支持搜索和分类浏览。每日课堂每天推送一个新知识点。',
    highlights: ['技术指标：K线、均线、量价、MACD、KDJ', '基本面：市盈率、市净率、ROE 等', '交易规则：T+1、涨跌停、手续费', '每日课堂：60 天系统学习体系'],
  },
  {
    target: null,
    page: 'market',
    layout: 'banner',
    title: '市场行情',
    subtitle: '06 / 全市场概览',
    content: '展示当前市场热门股票排行和各板块涨跌情况。数据每 60 秒自动刷新，帮助快速了解市场整体动向，发现热点板块和强势股票。',
    highlights: ['热门股票：按涨跌幅排序的前10只', '板块热图：各行业板块平均涨跌幅', '点击股票直接跳转到 K 线图', '数据每 60 秒自动刷新'],
  },
  {
    target: null,
    page: 'strategy',
    layout: 'banner',
    title: '策略中心 · 量化回测',
    subtitle: '07 / 验证交易想法',
    content: '支持 MA 金叉死叉和 MACD 零轴穿越两种策略的历史回测。输入股票代码、时间范围和策略参数，系统自动计算年化收益率、最大回撤、胜率、夏普比率。',
    highlights: ['MA 金叉策略：MA5 上穿 MA20 买入', 'MACD 策略：MACD 柱由负转正买入', '回测结果：年化收益、最大回撤、胜率', '净值曲线：可视化策略历史表现'],
  },
  {
    target: null,
    page: 'personal',
    layout: 'banner',
    title: '个人中心',
    subtitle: '08 / 账户管理',
    content: '管理自选股列表（最多50只），记录交易笔记，查看历史 AI 对话记录。还可以设置初始本金（仅限未交易时）和账户公开/匿名设置。',
    highlights: ['自选股：快速访问关注的股票', '交易笔记：记录每笔交易的思考', '对话历史：回顾 AI 分析记录', '学习进度：追踪课程完成情况'],
  },
  {
    target: null,
    page: 'leaderboard',
    layout: 'banner',
    title: '排行榜',
    subtitle: '09 / 收益率竞技',
    content: '按收益率（而非金额）排名，不同初始本金的用户在同一标准下公平比较。可以设置匿名显示保护隐私。',
    highlights: ['收益率排名：公平比较不同本金', '显示最大回撤和胜率', '匿名模式：保护个人隐私', '查看自己的当前排名'],
  },
];

export default function TutorialTour({ step, onNext, onSkip, onComplete, onNavigate }) {
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // 动画状态
  const [visible, setVisible] = useState(false);
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const [bubbleStyle, setBubbleStyle] = useState({});
  const prevPageRef = useRef(null);

  // 切换步骤时：淡出 → 切换页面 → 淡入
  const handleNext = (dir) => {
    setVisible(false);
    setTimeout(() => onNext(dir), 250);
  };
  const handleSkip = () => {
    setVisible(false);
    setTimeout(onSkip, 200);
  };
  const handleComplete = () => {
    setVisible(false);
    setTimeout(onComplete, 200);
  };

  // 切换页面
  useEffect(() => {
    if (!current) return;
    if (current.page && onNavigate && current.page !== prevPageRef.current) {
      prevPageRef.current = current.page;
      onNavigate(current.page);
    }
    // banner 步骤才滚到顶部，spotlight 步骤由 scrollIntoView 控制
    if (current.layout === 'banner') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [step]);

  // 定位 + 淡入
  useEffect(() => {
    if (!current) return;
    setVisible(false);
    setSpotlightStyle(null);

    const compute = () => {
      if (current.layout === 'banner' || !current.target) {
        setBubbleStyle({});
        setSpotlightStyle(null);
        setVisible(true);
        return;
      }

      // 先激活对应卡片（如果未开启）
      if (current.cardId) {
        window.dispatchEvent(new CustomEvent('yq:activate-card', { detail: { cardId: current.cardId } }));
      }

      const el = document.getElementById(current.target);
      if (!el) {
        setBubbleStyle({});
        setVisible(true);
        return;
      }

      // 先把目标卡片滚动到视口中央
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 等滚动动画完成（约 500ms）再计算位置并显示弹窗
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const pad = 8;

        // Spotlight
        setSpotlightStyle({
          position: 'fixed',
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          borderRadius: '2rem',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          border: '1.5px solid rgba(20,184,166,0.5)',
          zIndex: 1001,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        });

        // 弹窗位置：优先放在卡片右侧，右侧放不下则放左侧，都放不下则放下方
        const bw = 400, bh = 320;
        const vw = window.innerWidth, vh = window.innerHeight;
        let top, left, arrowSide;

        const spaceRight = vw - rect.right - 16;
        const spaceLeft = rect.left - 16;
        const spaceBottom = vh - rect.bottom - 16;

        if (spaceRight >= bw + 16) {
          // 右侧有空间
          left = rect.right + 16;
          top = rect.top + rect.height / 2 - bh / 2;
          arrowSide = 'left'; // 箭头指向左（指向卡片）
        } else if (spaceLeft >= bw + 16) {
          // 左侧有空间
          left = rect.left - bw - 16;
          top = rect.top + rect.height / 2 - bh / 2;
          arrowSide = 'right';
        } else if (spaceBottom >= bh + 16) {
          // 下方有空间
          left = rect.left + rect.width / 2 - bw / 2;
          top = rect.bottom + 16;
          arrowSide = 'top';
        } else {
          // 上方
          left = rect.left + rect.width / 2 - bw / 2;
          top = rect.top - bh - 16;
          arrowSide = 'bottom';
        }

        // 边界保护
        left = Math.max(12, Math.min(left, vw - bw - 12));
        top = Math.max(70, Math.min(top, vh - bh - 12));

        setBubbleStyle({ position: 'fixed', top, left, width: bw, arrowSide });
        setVisible(true);
      }, 550);
    };

    const t = setTimeout(compute, 350);
    return () => clearTimeout(t);
  }, [step, current]);

  if (!current) return null;

  // ── Banner 布局（页面级介绍）──
  if (current.layout === 'banner') {
    return createPortal(
      <div className={`fixed inset-x-0 bottom-0 z-[1000] transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* 顶部渐变遮罩，不完全虚化背景 */}
        <div className="absolute inset-x-0 bottom-full h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        <div className="relative bg-[#0a0a0b]/98 border-t border-white/10 backdrop-blur-xl px-8 py-5 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <div className="max-w-5xl mx-auto flex items-start gap-8">
            {/* 左：标题 + 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[9px] font-black text-secondary/70 uppercase tracking-widest">{current.subtitle}</span>
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all duration-400 ${i === step ? 'w-5 h-1.5 bg-secondary' : i < step ? 'w-1.5 h-1.5 bg-secondary/40' : 'w-1.5 h-1.5 bg-white/10'}`} />
                  ))}
                </div>
              </div>
              <h3 className="text-lg font-black text-white mb-1.5">{current.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{current.content}</p>
            </div>

            {/* 中：要点 */}
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <div className="flex flex-col gap-1.5">
                {current.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-secondary/50 mt-1.5 flex-shrink-0" />
                    <span className="text-xs text-white/40">{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右：按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0 self-center">
              <button onClick={handleSkip} className="text-white/25 hover:text-white/50 transition-all p-1.5">
                <X size={16} />
              </button>
              {step > 0 && (
                <button onClick={() => handleNext(-1)}
                  className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white transition-all">
                  <ChevronLeft size={13} />
                </button>
              )}
              <button onClick={() => isLast ? handleComplete() : handleNext(1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-black font-black text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all">
                {isLast ? '开始使用' : '下一步'}
                {!isLast && <ChevronRight size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Spotlight 布局（卡片级介绍）──
  return createPortal(
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* 遮罩 */}
      <div className="absolute inset-0 pointer-events-auto" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight 高亮框 */}
      {spotlightStyle && <div style={spotlightStyle} />}

      {/* 弹窗气泡 */}
      <div
        className={`absolute pointer-events-auto z-[1002] transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={bubbleStyle}
      >
        <div className="bg-[#0a0a0b] border border-white/12 rounded-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          {/* 顶部装饰光 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />

          {/* 步骤 + 关闭 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-400 ${i === step ? 'w-5 h-1.5 bg-secondary' : i < step ? 'w-1.5 h-1.5 bg-secondary/40' : 'w-1.5 h-1.5 bg-white/10'}`} />
                ))}
              </div>
              <span className="text-[9px] text-white/25 font-black uppercase tracking-widest ml-1">{step + 1}/{TOUR_STEPS.length}</span>
            </div>
            <button onClick={handleSkip} className="text-white/20 hover:text-white transition-all p-1 rounded-lg hover:bg-white/5">
              <X size={14} />
            </button>
          </div>

          {/* 标题 */}
          <div className="mb-3">
            <p className="text-[9px] font-black text-secondary/60 uppercase tracking-widest mb-0.5">{current.subtitle}</p>
            <h3 className="text-base font-black text-white tracking-tight">{current.title}</h3>
          </div>

          {/* 内容 */}
          <p className="text-xs text-white/55 leading-relaxed mb-3">{current.content}</p>

          {/* 要点 */}
          <div className="flex flex-col gap-1 mb-4">
            {current.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-secondary/50 mt-1.5 flex-shrink-0" />
                <span className="text-[11px] text-white/40">{h}</span>
              </div>
            ))}
          </div>

          {/* 按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={() => handleNext(-1)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/8 rounded-xl text-xs font-black text-white/40 hover:text-white transition-all">
                  <ChevronLeft size={12} />上一步
                </button>
              )}
            </div>
            <button onClick={() => isLast ? handleComplete() : handleNext(1)}
              className="flex items-center gap-2 px-4 py-1.5 bg-secondary text-black font-black text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all">
              {isLast ? '开始使用' : '下一步'}
              {!isLast && <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* 指向卡片的小箭头 */}
        {bubbleStyle.arrowSide === 'top' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="w-3 h-3 bg-[#0a0a0b] border-l border-t border-white/12 rotate-45" />
          </div>
        )}
        {bubbleStyle.arrowSide === 'bottom' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="w-3 h-3 bg-[#0a0a0b] border-r border-b border-white/12 rotate-45" />
          </div>
        )}
        {bubbleStyle.arrowSide === 'right' && (
          <div className="absolute top-1/2 -translate-y-1/2 -right-2">
            <div className="w-3 h-3 bg-[#0a0a0b] border-r border-t border-white/12 rotate-45" />
          </div>
        )}
        {bubbleStyle.arrowSide === 'left' && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-2">
            <div className="w-3 h-3 bg-[#0a0a0b] border-l border-b border-white/12 rotate-45" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
