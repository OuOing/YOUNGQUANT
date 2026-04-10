import React, { useState, useEffect } from 'react';

const FEATURES = [
  {
    tag: 'AI',
    title: 'AI 量化分析',
    desc: '基于 YoungQuant V1 模型，实时解读 K 线形态、趋势和资金流向，生成 BUY/SELL/HOLD 信号。',
  },
  {
    tag: 'SIM',
    title: '模拟交易',
    desc: '自选虚拟本金（1万/10万/50万/100万），遵循 A 股真实规则（T+1、涨跌停、万五手续费），零风险练习交易。',
  },
  {
    tag: 'GPT',
    title: 'AI 对话助手',
    desc: '随时提问行情、策略、风险管理，AI 结合当前股票数据给出专业解答。',
  },
  {
    tag: 'BT',
    title: '量化回测',
    desc: '支持 MA 金叉死叉、MACD 零轴穿越等策略回测，验证你的交易想法。',
  },
  {
    tag: 'EDU',
    title: '系统学习',
    desc: '从 K 线基础到量化策略，60 天课程体系，每日一课，循序渐进。',
  },
  {
    tag: 'RNK',
    title: '收益排行榜',
    desc: '与其他用户竞技，看看你的模拟盘收益率排名如何。',
  },
];

const STATS = [
  { value: '10+', label: '支持股票' },
  { value: '60', label: '学习课程' },
  { value: '200+', label: '专业术语' },
  { value: '24/7', label: 'AI 在线' },
];

const LandingPage = ({ onEnter, onOpenAuth }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div className={`min-h-screen bg-bg-deep font-sans transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* 背景光晕 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/10 border border-secondary/20 rounded-full text-[11px] font-black text-secondary uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            AI 量化模拟交易平台
          </div>

          {/* 标题 */}
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-[1.05]">
            Young<span className="text-secondary">Quant</span>
            <br />
            <span className="text-white/35 text-2xl md:text-3xl font-light tracking-normal">用 AI 学会量化投资</span>
          </h1>

          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
            零风险模拟 A 股交易，AI 实时分析行情，系统学习量化策略。
            从入门到进阶，YoungQuant 陪你走完每一步。
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={onEnter}
              className="px-8 py-4 bg-secondary text-black font-black text-sm rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-secondary/20"
            >
              免费开始体验 →
            </button>
            <button
              onClick={onOpenAuth}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black text-sm rounded-2xl hover:bg-white/10 transition-all"
            >
              注册账号
            </button>
          </div>

          {/* 统计数字 */}
          <div className="grid grid-cols-4 gap-6 max-w-lg mx-auto mt-16">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 功能特性 */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">为什么选择 YoungQuant</h2>
          <p className="text-white/40">专为 A 股投资学习者设计的 AI 量化平台</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:border-secondary/20 hover:bg-white/[0.05] transition-all group">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 mb-3">
                <span className="text-[10px] font-black text-secondary tracking-widest">{f.tag}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 tracking-tight">{f.title}</h3>
              <p className="text-[12px] text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 底部 CTA */}
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="bg-white/[0.03] border border-secondary/20 rounded-3xl p-10">
          <h2 className="text-2xl font-black text-white mb-3">准备好了吗？</h2>
          <p className="text-white/40 mb-6 text-sm">注册时选择你的虚拟本金，立即开始量化投资之旅。</p>
          <button
            onClick={onOpenAuth}
            className="px-8 py-3 bg-secondary text-black font-black text-sm rounded-2xl hover:brightness-110 transition-all"
          >
            免费注册
          </button>
          <p className="text-[10px] text-white/20 mt-4">无需信用卡 · 完全免费 · 数据安全</p>
        </div>
      </div>

      {/* 底部 */}
      <div className="border-t border-white/5 py-6 text-center">
        <p className="text-[11px] text-white/20">
          © 2026 YoungQuant · AI 量化模拟交易平台 · 仅供学习，不构成投资建议
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
