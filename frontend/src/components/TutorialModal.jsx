import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, X, Sparkles, Layout, BarChart, HardDrive } from 'lucide-react';

const TutorialModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '欢迎来到专业训练场',
      subtitle: 'YoungQuant Pro 终端入门指南',
      icon: <Sparkles className="text-primary" size={48} />,
      content: '本系统是为专业量化交易者设计的实盘模拟终端。我们将通过 70/30 布局为您提供决策支持。',
      details: ['AI 驱动的实时信号', '1:1 实盘仿真交易', '深度投研分析中心']
    },
    {
      title: '70/30 核心布局',
      subtitle: '为高效决策而生',
      icon: <Layout className="text-secondary" size={48} />,
      content: '左侧 (70%) 是您的执行区，包含专业 K 线与持仓。右侧 (30%) 是情报区，集成 AI 对话与资产看板。',
      details: ['Tab 切换：持仓、历史、日志', '全局搜索选择器', 'AI 信号快速执行']
    },
    {
      title: '解读 AI 因子',
      subtitle: '数据标注与逻辑透明',
      icon: <BarChart className="text-accent" size={48} />,
      content: '我们在“深度洞察”页面标注了核心量化数据：',
      details: [
        '情绪指数 (Sentiment): 0-100 贪婪/恐慌度',
        '技术 KPI: 综合 MA/RSI 指标评分',
        '预测矩阵: LSTM 模型的上涨/空间预案'
      ]
    }
  ];

  if (!isOpen) return null;

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in transition-all">
      <div className="absolute inset-0 bg-bg-deep/60 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="w-full max-w-2xl bg-bg-main/95 shadow-[0_32px_128px_rgba(0,0,0,0.95)] relative z-10 overflow-hidden rounded-[3rem] border border-white/10 animate-fade-in">
        <div className="p-14">
          <div className="flex justify-between items-start mb-14">
            <div className="flex items-center gap-8">
               <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
                 {React.cloneElement(current.icon, { size: 48, className: 'text-white' })}
               </div>
               <div>
                  <h2 className="text-4xl font-black font-brand tracking-tighter text-white">{current.title}</h2>
                  <p className="text-text-dim text-xs uppercase tracking-[0.4em] font-black mt-3 leading-none italic">{current.subtitle}</p>
               </div>
            </div>
            <button onClick={onClose} className="text-text-dim hover:text-white transition-colors p-4 bg-white/5 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="mb-14 min-h-[180px]">
            <p className="text-2xl text-text-main font-bold leading-relaxed mb-12 opacity-90">{current.content}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {current.details.map((d, i) => (
                <div key={i} className="flex flex-col gap-4 p-6 bg-black/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors shadow-inner">
                  <CheckCircle2 size={24} className="text-white/40" />
                  <span className="text-[0.8rem] font-black text-text-muted leading-tight uppercase tracking-wider">{d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center py-10 border-t border-white/10">
            <div className="flex gap-4">
              {steps.map((_, i) => (
                <div key={i} className={`h-2.5 rounded-full transition-all duration-700 ${i === step ? 'w-16 bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'w-4 bg-white/10'}`}></div>
              ))}
            </div>
            <button 
              onClick={() => step < steps.length - 1 ? setStep(step + 1) : onClose()}
              className="bg-white text-black px-12 py-5 rounded-2xl font-black text-base flex items-center gap-4 hover:brightness-90 active:scale-95 transition-all shadow-2xl shadow-white/5 uppercase tracking-widest"
            >
              {step < steps.length - 1 ? '下一步指令 NEXT' : '开启实盘仿真 START'} <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
