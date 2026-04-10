import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    tag: 'WELCOME',
    title: 'YoungQuant',
    subtitle: '专为 A 股学习者设计的 AI 量化平台',
    desc: '选择你的虚拟本金，在真实 A 股规则下练习交易。AI 实时分析行情，帮你从零建立量化思维。',
    cta: '开始了解',
    visual: null,
  },
  {
    id: 'ai',
    tag: '01 / AI 分析',
    title: 'AI 实时解读行情',
    subtitle: 'BUY · SELL · HOLD',
    desc: '基于 YoungQuant V1 模型，系统会实时分析 K 线形态、趋势和资金流向，给出带置信度的交易信号。你不需要懂技术分析，AI 帮你看。',
    cta: '下一步',
    visual: 'ai',
  },
  {
    id: 'trade',
    tag: '02 / 模拟交易',
    title: '零风险练习真实交易',
    subtitle: 'T+1 · 涨跌停 · 手续费',
    desc: '遵循 A 股全部真实规则，包括 T+1 限制、涨跌停板、万五手续费（最低 5 元）。用虚拟资金感受真实市场压力，不怕亏损地反复练习。',
    cta: '下一步',
    visual: 'trade',
  },
  {
    id: 'learn',
    tag: '03 / 系统学习',
    title: '从 K 线到量化策略',
    subtitle: '60 天课程 · 每日一课',
    desc: '结构化学习路径：K 线基础 → 技术指标 → 量化策略 → 风险管理。每天 5 分钟，60 天建立完整的量化投资知识体系。',
    cta: '下一步',
    visual: 'learn',
  },
  {
    id: 'backtest',
    tag: '04 / 量化回测',
    title: '验证你的交易想法',
    subtitle: 'MA 金叉 · MACD · 历史数据',
    desc: '把你的交易策略跑一遍历史数据，看看胜率、最大回撤、夏普比率。在真金白银之前，先用数据说话。',
    cta: '开始使用',
    visual: 'backtest',
    isLast: true,
  },
];

const VisualAI = () => (
  <div className="flex flex-col gap-2 w-full max-w-xs">
    {[
      { sym: '紫金矿业', signal: 'BUY', conf: '87%', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
      { sym: '贵州茅台', signal: 'HOLD', conf: '72%', color: 'text-white/40 border-white/10 bg-white/[0.02]' },
      { sym: '宁德时代', signal: 'SELL', conf: '65%', color: 'text-red-400 border-red-400/30 bg-red-400/5' },
    ].map((item, i) => (
      <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${item.color} transition-all`}>
        <span className="text-xs text-white/60">{item.sym}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30">{item.conf}</span>
          <span className={`text-[10px] font-black tracking-widest ${item.color.split(' ')[0]}`}>{item.signal}</span>
        </div>
      </div>
    ))}
  </div>
);

const VisualTrade = () => (
  <div className="w-full max-w-xs bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex justify-between text-[10px]">
      <span className="text-white/30 uppercase tracking-widest">模拟账户</span>
      <span className="text-secondary font-black">自选本金</span>
    </div>
    <div className="h-px bg-white/5" />
    <div className="grid grid-cols-2 gap-2">
      {[['可用资金', '¥ 68,420'], ['持仓市值', '¥ 31,580'], ['今日盈亏', '+¥ 840'], ['总收益率', '+2.34%']].map(([k, v]) => (
        <div key={k} className="bg-white/[0.02] rounded-xl p-2.5">
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">{k}</p>
          <p className={`text-xs font-black ${v.startsWith('+') ? 'text-green-400' : 'text-white'}`}>{v}</p>
        </div>
      ))}
    </div>
  </div>
);

const VisualLearn = () => (
  <div className="w-full max-w-xs flex flex-col gap-2">
    {[
      { day: 'DAY 01', title: 'K 线基础：阴阳线的含义', done: true },
      { day: 'DAY 02', title: '均线系统：MA5 与 MA20', done: true },
      { day: 'DAY 03', title: '量价关系：放量突破', done: false, active: true },
      { day: 'DAY 04', title: 'MACD 指标入门', done: false },
    ].map((item, i) => (
      <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${item.active ? 'border-secondary/30 bg-secondary/5' : item.done ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 opacity-40'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${item.done ? 'bg-secondary/20 text-secondary' : item.active ? 'bg-secondary text-black' : 'bg-white/5 text-white/20'}`}>
          {item.done ? '✓' : item.active ? '→' : '·'}
        </div>
        <div>
          <p className="text-[9px] text-white/20 uppercase tracking-widest">{item.day}</p>
          <p className={`text-xs ${item.active ? 'text-white font-semibold' : 'text-white/50'}`}>{item.title}</p>
        </div>
      </div>
    ))}
  </div>
);

const VisualBacktest = () => (
  <div className="w-full max-w-xs bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-white/30 uppercase tracking-widest">MA 金叉策略 · 回测结果</span>
    </div>
    <div className="h-px bg-white/5" />
    <div className="grid grid-cols-2 gap-2">
      {[['年化收益', '+18.4%', true], ['最大回撤', '-12.3%', false], ['胜率', '58.2%', true], ['夏普比率', '1.42', true]].map(([k, v, pos]) => (
        <div key={k} className="bg-white/[0.02] rounded-xl p-2.5">
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">{k}</p>
          <p className={`text-xs font-black ${pos ? 'text-green-400' : 'text-red-400'}`}>{v}</p>
        </div>
      ))}
    </div>
    <div className="h-12 flex items-end gap-0.5 px-1">
      {[30,45,38,52,48,60,55,70,65,80,72,85].map((h, i) => (
        <div key={i} className="flex-1 bg-secondary/30 rounded-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const VISUALS = { ai: VisualAI, trade: VisualTrade, learn: VisualLearn, backtest: VisualBacktest };

export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const current = STEPS[step];

  const goNext = () => {
    if (animating) return;
    if (current.isLast) { onComplete(); return; }
    setAnimating(true);
    setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 300);
  };

  const Visual = current.visual ? VISUALS[current.visual] : null;

  return (
    <div className="fixed inset-0 z-[200] bg-bg-deep flex items-center justify-center">
      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/6 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* 进度条 */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
        <div
          className="h-full bg-secondary transition-all duration-700 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* 跳过按钮 */}
      {!current.isLast && (
        <button
          onClick={onComplete}
          className="absolute top-6 right-8 text-[11px] text-white/20 hover:text-white/50 transition-all tracking-widest uppercase"
        >
          跳过
        </button>
      )}

      {/* 步骤指示 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${i === step ? 'w-6 h-1.5 bg-secondary' : i < step ? 'w-1.5 h-1.5 bg-secondary/40' : 'w-1.5 h-1.5 bg-white/10'}`}
          />
        ))}
      </div>

      {/* 主内容 */}
      <div
        className={`relative z-10 w-full max-w-4xl mx-auto px-8 flex items-center gap-16 transition-all duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
      >
        {/* 左侧文字 */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-[10px] font-black text-secondary uppercase tracking-widest mb-6">
            <span className="w-1 h-1 rounded-full bg-secondary" />
            {current.tag}
          </div>

          <h1 className={`font-black text-white tracking-tighter leading-[1.05] mb-3 ${step === 0 ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'}`}>
            {current.title}
          </h1>

          {current.subtitle && (
            <p className="text-sm font-light text-secondary/70 tracking-widest uppercase mb-6">
              {current.subtitle}
            </p>
          )}

          <p className="text-base text-white/40 leading-relaxed max-w-md mb-10">
            {current.desc}
          </p>

          <button
            onClick={goNext}
            className="inline-flex items-center gap-3 px-8 py-4 bg-secondary text-black font-black text-sm rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-secondary/20"
          >
            {current.cta}
            {current.isLast ? <ArrowRight size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* 右侧视觉 */}
        <div className="hidden md:flex flex-col items-center justify-center w-80 flex-shrink-0">
          {Visual ? (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <Visual />
            </div>
          ) : (
            /* Welcome 页：大字装饰 */
            <div className="text-center select-none">
              <p
                className="text-[72px] font-black leading-none tracking-tighter"
                style={{
                  background: 'linear-gradient(to right, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.01) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >YoungQuant</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
