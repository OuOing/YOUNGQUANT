import React, { useMemo, useState } from 'react';
import { FileText, Search, ArrowLeft, ChevronRight } from 'lucide-react';

const Section = ({ id, title, subtitle, children }) => (
  <section id={id} className="scroll-mt-28">
    <div className="mb-5">
      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30 mb-1">{subtitle}</div>
      <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
    </div>
    <div className="text-sm text-white/60 leading-relaxed space-y-4">{children}</div>
  </section>
);

const Example = ({ children }) => (
  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 mt-3">
    <div className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-2">示例</div>
    <div className="text-sm text-white/55 leading-relaxed">{children}</div>
  </div>
);

const Tip = ({ children }) => (
  <div className="border-l-2 border-secondary/40 pl-4 py-1 text-secondary/70 text-sm">{children}</div>
);

export default function EvidenceDocs({ onBack }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState('overview');

  const nav = useMemo(() => ([
    { id: 'overview',   title: '总览',        subtitle: 'DOCS / OVERVIEW' },
    { id: 'trend',      title: '趋势与结构',  subtitle: 'TERMINAL / TREND' },
    { id: 'timeframe',  title: '周期与噪音',  subtitle: 'TIMEFRAME / NOISE' },
    { id: 'risk',       title: '仓位与止损',  subtitle: 'RISK / POSITION' },
    { id: 'ai',         title: '如何提问 AI', subtitle: 'AI / PROMPTING' },
    { id: 'execution',  title: '执行纪律',    subtitle: 'EXEC / DISCIPLINE' },
    { id: 'pipeline',   title: '数据与流水线',subtitle: 'DATA / PIPELINE' },
    { id: 'model',      title: 'AI 模型原理', subtitle: 'MODEL / XGBOOST' },
    { id: 'disclaimer', title: '风险告示',    subtitle: 'LEGAL / DISCLAIMER' },
  ]), []);

  const filtered = useMemo(() => {
    const term = (q || '').trim().toLowerCase();
    if (!term) return nav;
    return nav.filter(s => (s.title + s.subtitle).toLowerCase().includes(term));
  }, [nav, q]);

  const jump = (id) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-bg-deep font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <FileText size={16} className="text-white/60" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30">YoungQuant Pro · Evidence</div>
              <div className="text-xl font-black text-white tracking-tight">炒股知识点依据文档</div>
            </div>
          </div>
          <button onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 hover:text-white hover:border-white/20 transition-all">
            <ArrowLeft size={13} /> 返回终端
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* 左侧导航 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="bg-black/40 border border-white/8 rounded-2xl p-4">
              <div className="relative mb-4">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索章节..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-black/50 border border-white/5 text-xs font-bold text-white/70 outline-none focus:border-secondary/30 transition-all" />
              </div>
              <div className="flex flex-col gap-1">
                {filtered.map(s => (
                  <button key={s.id} onClick={() => jump(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${active === s.id ? 'bg-secondary/10 border border-secondary/20' : 'hover:bg-white/5 border border-transparent'}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-0.5">{s.subtitle}</div>
                    <div className={`text-xs font-black ${active === s.id ? 'text-secondary' : 'text-white/70'}`}>{s.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* 右侧内容 */}
          <main className="bg-black/40 border border-white/8 rounded-2xl p-8 space-y-12">

            <Section id="overview" title="如何阅读这些依据" subtitle="DOCS / OVERVIEW">
              <p>本文档是 YoungQuant 平台每个功能背后的知识支撑。目标不是让你"照做"，而是让你理解：<strong className="text-white/80">为什么这么做</strong>、<strong className="text-white/80">什么情况下会失效</strong>，以及如何结合自己的风险偏好落地。</p>
              <Tip>建议阅读顺序：风险告示 → 仓位与止损 → 趋势与结构 → 执行纪律 → AI 模型原理</Tip>
              <p>平台提供的所有信号、分析、建议均为辅助工具，最终决策权在你手中。</p>
            </Section>

            <Section id="trend" title="趋势与结构" subtitle="TERMINAL / TREND">
              <p>趋势判断的核心是<strong className="text-white/80">结构化信号</strong>，而非价格的绝对涨跌。关键观察点：</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li>高点是否持续抬高（上升趋势）/ 低点是否持续下移（下降趋势）</li>
                <li>关键支撑/阻力位是否被有效突破并站稳</li>
                <li>回撤时是否有买盘承接（缩量回调 vs 放量下跌）</li>
                <li>均线系统（MA5/MA20）的多空排列</li>
              </ul>
              <Example>
                上升趋势中的"回调买"不是随便买，而是买在"结构不被破坏"的回撤里。判断标准：前低未被跌破、成交量萎缩、MA5 仍在 MA20 上方。一旦低点不再抬高，应考虑减仓或止损。
              </Example>
              <p>AI 信号（BUY/SELL/HOLD）综合了 MA 金叉死叉、RSI 超买超卖、MACD 零轴穿越等多个结构信号，置信度越高代表多个信号同向共振。</p>
            </Section>

            <Section id="timeframe" title="周期与噪音" subtitle="TIMEFRAME / NOISE">
              <p>不同时间周期的信号质量差异显著：</p>
              <div className="grid grid-cols-3 gap-3 my-2">
                {[
                  { period: '15分钟', use: '执行层节奏控制、精确入场点', noise: '高', suitable: '短线' },
                  { period: '日线', use: '趋势判断、中线持仓决策', noise: '低', suitable: '中线' },
                  { period: '周线', use: '大趋势确认、仓位方向', noise: '极低', suitable: '长线' },
                ].map(item => (
                  <div key={item.period} className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                    <p className="text-xs font-black text-white mb-1">{item.period}</p>
                    <p className="text-[10px] text-white/40 mb-1">{item.use}</p>
                    <p className="text-[9px] text-white/25">噪音：{item.noise} · {item.suitable}</p>
                  </div>
                ))}
              </div>
              <Tip>多周期共振：日线看方向，15分钟找入场点。两个周期信号一致时，胜率更高。</Tip>
              <p>平台目前支持 15分钟线和日线两个周期，建议日线确认趋势后，用 15分钟线寻找更优的入场时机。</p>
            </Section>

            <Section id="risk" title="仓位与止损" subtitle="RISK / POSITION">
              <p>仓位管理是交易系统的核心，决定了你能否在市场中长期生存。核心原则：</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li><strong className="text-white/70">单笔风险不超过总资金的 2-5%</strong>：即止损触发时最大亏损额</li>
                <li><strong className="text-white/70">单只股票仓位不超过 30%</strong>：平台风控会在超过时提示</li>
                <li><strong className="text-white/70">止损位在入场前确定</strong>：不要在亏损后才想止损价格</li>
                <li><strong className="text-white/70">浮亏超过 10% 强制复盘</strong>：平台会自动提示止损建议</li>
              </ul>
              <Example>
                总资金 10万，单笔风险 2% = 2000元。若止损位在买入价下方 5%，则最大仓位 = 2000 / 5% = 4万，即 40% 仓位。
              </Example>
              <p>A股特有规则：T+1 制度意味着当日买入无法当日卖出，止损执行有一天的延迟风险，因此止损位应适当宽松，或使用限价卖单提前挂出。</p>
            </Section>

            <Section id="ai" title="如何提问 AI" subtitle="AI / PROMPTING">
              <p>AI 对话助手基于 YoungQuant V1 模型，结合当前股票的实时数据回答问题。让 AI 给出"场景与条件"，而不是让它替你"拍板"。</p>
              <p className="text-white/50">高质量提问模板：</p>
              <div className="space-y-2">
                {[
                  '「当前 MA5 上穿 MA20，RSI 在 55，这个信号的可靠性如何？失效条件是什么？」',
                  '「如果我在 XX 价格买入，止损应该设在哪里？理由是什么？」',
                  '「对比 15分钟和日线信号，现在适合短线还是等待？」',
                  '「这只股票最近的量价关系说明了什么？主力在出货还是吸筹？」',
                ].map((q, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white/50 italic">{q}</div>
                ))}
              </div>
              <Tip>避免问"这只股票会涨吗"——AI 无法预测未来，但可以帮你分析当前结构和风险。</Tip>
            </Section>

            <Section id="execution" title="执行纪律" subtitle="EXEC / DISCIPLINE">
              <p>交易失败的最常见原因不是分析错误，而是执行失控。核心纪律：</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li><strong className="text-white/70">决策与执行分离</strong>：先把计划写清楚（入场价、止损价、目标价），再点击按钮</li>
                <li><strong className="text-white/70">不追涨杀跌</strong>：价格已经大幅偏离计划入场点时，放弃这笔交易</li>
                <li><strong className="text-white/70">止损不移动</strong>：亏损时不要把止损位下移"再等等"</li>
                <li><strong className="text-white/70">盈利时不要过早离场</strong>：让利润奔跑，用移动止损保护盈利</li>
              </ul>
              <Example>
                情绪化交易的典型模式：看到涨了追进去 → 跌了不舍得止损 → 越套越深 → 最终割肉在最低点。平台的 AI 复盘功能会帮你识别这类模式。
              </Example>
              <p>使用平台的<strong className="text-white/80">限价单功能</strong>可以有效避免追涨：提前设好目标价格，系统自动在价格到达时成交，不需要盯盘。</p>
            </Section>

            <Section id="pipeline" title="数据与流水线" subtitle="DATA / PIPELINE">
              <p>平台的数据流水线分四个阶段，每次点击"重训流水线"都会完整执行：</p>
              <div className="space-y-3">
                {[
                  { step: '01', name: '数据获取', file: 'fetch_data.py', desc: '通过 AkShare 从东方财富拉取最新 K 线数据（日线 + 15分钟线），存入 SQLite 数据库。数据包含开高低收量，前复权处理。' },
                  { step: '02', name: '特征工程', file: 'prepare_features.py', desc: '基于原始 K 线计算技术指标：MA5、MA20、RSI14、MACD 柱状图、MA5/MA20 比率、日收益率。这 6 个特征构成模型的输入向量。' },
                  { step: '03', name: '模型训练', file: 'train_model.py', desc: 'XGBoost 分类器学习历史价格模式，目标是预测下一周期收盘价涨跌方向（二分类）。参数：n_estimators=300, max_depth=6, learning_rate=0.05。' },
                  { step: '04', name: '回测评估', file: 'backtest.py', desc: '在历史数据上验证模型信号，计算年化收益率、最大回撤、胜率、夏普比率。支持 MA 金叉和 MACD 零轴穿越两种策略。' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4 bg-white/[0.02] border border-white/8 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-[10px] font-black text-secondary flex-shrink-0">{item.step}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-white">{item.name}</span>
                        <span className="text-[9px] font-mono text-white/25">{item.file}</span>
                      </div>
                      <p className="text-[11px] text-white/45 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Tip>数据缺失或质量差会导致指标偏差。看到"缺特征/缺模型"提示时，优先补齐流水线，不要强行解读信号。</Tip>
            </Section>

            <Section id="model" title="AI 模型原理" subtitle="MODEL / XGBOOST">
              <p>YoungQuant V1 使用 <strong className="text-white/80">XGBoost 梯度提升树</strong>作为核心预测模型，这是量化交易中最常用的机器学习算法之一。</p>
              <p>模型的工作原理：</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li>输入：6 维技术指标特征向量（MA5比率、MA20比率、RSI14、MACD柱、铜价涨幅、日收益率）</li>
                <li>输出：下一周期涨跌概率（0-1），超过 0.5 为 BUY 信号</li>
                <li>训练集：历史 80% 数据，测试集：最近 20% 数据</li>
                <li>评估指标：测试集准确率（通常在 52-58% 之间）</li>
              </ul>
              <Tip>52-58% 的准确率听起来不高，但在金融市场中，只要胜率超过 50% 且盈亏比合理，长期期望值就是正的。</Tip>
              <p>模型的局限性：</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li>基于历史数据训练，无法预测黑天鹅事件</li>
                <li>在趋势不明显的震荡市中准确率下降</li>
                <li>每只股票独立训练，不考虑板块联动效应</li>
                <li>数据越新鲜，预测越准确——建议每天收盘后重训一次</li>
              </ul>
            </Section>

            <Section id="disclaimer" title="风险告示" subtitle="LEGAL / DISCLAIMER">
              <p className="text-white/70">本平台提供的所有内容，包括但不限于：AI 信号、技术分析、量化模型输出、AI 对话建议，均<strong className="text-white">不构成投资建议</strong>。</p>
              <ul className="list-disc list-inside space-y-1 text-white/55">
                <li>股票市场存在风险，过去的表现不代表未来收益</li>
                <li>模拟盘与真实交易存在差异（滑点、流动性、心理压力等）</li>
                <li>本平台仅供学习和研究使用，不对任何投资损失负责</li>
                <li>请根据自身风险承受能力和财务状况独立做出投资决策</li>
              </ul>
              <div className="bg-down/5 border border-down/20 rounded-xl p-4 mt-2">
                <p className="text-xs text-down/80 font-black">重要提示：在将模拟盘策略应用于真实资金之前，请充分了解 A 股市场规则，并考虑咨询专业的投资顾问。</p>
              </div>
            </Section>

          </main>
        </div>
      </div>
    </div>
  );
}
