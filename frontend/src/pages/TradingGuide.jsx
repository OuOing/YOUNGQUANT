import React from 'react';

const TradingGuide = ({ onBack }) => {
  return (
    <div className="p-8 min-h-[calc(100vh-80px)] animate-fade-in bg-bg-deep font-sans">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest"
      >
        ← 返回主界面
      </button>

      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <div className="inline-block px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-[9px] font-black text-secondary uppercase tracking-widest mb-4">
            TRADING GUIDE
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">股票交易教程</h1>
          <p className="text-sm text-white/40">了解 A 股基础规则，掌握平台交易操作</p>
        </div>

        {/* T+1 */}
        <div className="section-card p-6">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">T+1 交割制度</h2>
          <div className="space-y-3 text-sm text-white/70 leading-relaxed">
            <p>A 股市场实行 <span className="text-white font-black">T+1</span> 交割制度：当日（T 日）买入的股票，最早在下一个交易日（T+1 日）才能卖出。</p>
            <p>资金方面，卖出股票后资金当日可用（T+0），但正式到账为 T+1。</p>
            <p className="text-secondary/80 text-xs bg-secondary/5 border border-secondary/10 rounded-xl p-3">
              本平台模拟盘遵循 T+1 规则，当日买入的股票次日方可卖出。
            </p>
          </div>
        </div>

        {/* 涨跌停 */}
        <div className="section-card p-6">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">涨跌停限制</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '主板股票', limit: '±10%', color: 'text-white' },
              { label: '科创板 / 创业板', limit: '±20%', color: 'text-secondary' },
              { label: 'ST / *ST 股票', limit: '±5%', color: 'text-down' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-xl font-black ${item.color}`}>{item.limit}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            涨停时无法继续买入（除非有人卖出），跌停时无法继续卖出。新股上市首日涨跌幅限制有所不同。
          </p>
        </div>

        {/* 手续费 */}
        <div className="section-card p-6">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">手续费说明</h2>
          <div className="space-y-3">
            {[
              { action: '买入', items: ['佣金：约 0.03%（最低 5 元）', '过户费：0.002%（沪市）'] },
              { action: '卖出', items: ['佣金：约 0.03%（最低 5 元）', '印花税：0.1%（单向征收）', '过户费：0.002%（沪市）'] },
            ].map((row, i) => (
              <div key={i} className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <span className={`text-xs font-black px-3 py-1 rounded-lg shrink-0 ${i === 0 ? 'bg-up/20 text-up' : 'bg-down/20 text-down'}`}>{row.action}</span>
                <ul className="text-sm text-white/60 space-y-1">
                  {row.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 如何下单 */}
        <div className="section-card p-6">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">如何在本平台买卖股票</h2>
          <ol className="space-y-3 text-sm text-white/70 leading-relaxed list-none">
            {[
              '在顶部搜索框输入股票代码或名称，切换到目标股票。',
              '查看右侧"交易台"卡片，确认当前价格和 AI 信号。',
              '选择"买入"或"卖出"，输入股数（最小单位 100 股/手）。',
              '确认金额后点击提交，系统以当前市价成交。',
              '成交后可在下方"资产明细"→"历史成交"中查看记录。',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* FAQ */}
        <div className="section-card p-6">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">常见问题</h2>
          <div className="space-y-4">
            {[
              { q: '为什么买入失败？', a: '可能原因：可用现金不足、输入股数不是 100 的整数倍、或该股票当日已涨停。' },
              { q: '卖出后资金何时到账？', a: '模拟盘中卖出后资金立即到账。真实 A 股交易资金 T+1 到账。' },
              { q: 'AI 信号准确吗？', a: 'AI 信号基于历史数据和量化模型，仅供参考，不构成投资建议。市场存在不确定性，请结合自身判断。' },
              { q: '游客数据会丢失吗？', a: '游客数据保存在浏览器本地存储（localStorage），清除浏览器数据后会丢失。注册登录后数据永久保存在服务器。' },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm font-black text-white mb-1">Q: {item.q}</p>
                <p className="text-sm text-white/60">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingGuide;
