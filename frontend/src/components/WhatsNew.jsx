import React, { useState, useEffect } from 'react';
import { BarChart2, Search, TrendingUp, Newspaper, Zap, X, ChevronRight, Sparkles } from 'lucide-react';

const UPDATES = [
  {
    version: '1.3.0',
    date: '2026-04-14',
    title: '功能更新',
    highlights: [
      { icon: BarChart2, text: 'K 线图自动识别形态（锤子线、金叉/死叉），右上角显示标注' },
      { icon: Search, text: 'AI 研报支持术语悬浮解释，鼠标悬停专业名词即可查看' },
      { icon: TrendingUp, text: '交易复盘新增迷你 K 线图，标注你的买入/卖出点位' },
      { icon: Newspaper, text: '财经快讯接入新浪财经实时数据，有摘要和来源' },
      { icon: Zap, text: '行情数据更新改用新浪财经，速度更快更稳定' },
    ],
  },
];

const LATEST = UPDATES[0];

const WhatsNew = ({ onNavigate }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `yq_whats_new_${LATEST.version}`;
    if (!localStorage.getItem(key)) {
      // 延迟 2 秒显示，不要一进来就弹
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(`yq_whats_new_${LATEST.version}`, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-[#0a0a0b] border border-secondary/30 rounded-3xl shadow-2xl shadow-secondary/10 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-400">
        {/* 顶部装饰 */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent" />

        <div className="p-5">
          {/* 头部 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <Sparkles size={14} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs font-black text-white">版本 {LATEST.version} 更新</p>
                <p className="text-[10px] text-white/30">{LATEST.date}</p>
              </div>
            </div>
            <button onClick={dismiss} className="text-white/20 hover:text-white transition-colors p-1">
              <X size={14} />
            </button>
          </div>

          {/* 更新列表 */}
          <div className="flex flex-col gap-2 mb-4">
            {LATEST.highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={11} className="text-white/40" />
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>

          {/* 操作 */}
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 bg-secondary text-black font-black text-xs rounded-xl hover:brightness-110 transition-all"
            >
              知道了
            </button>
            <button
              onClick={() => { onNavigate?.('learning'); dismiss(); }}
              className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 text-white/50 text-xs font-black rounded-xl hover:text-white transition-all"
            >
              去体验 <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;
