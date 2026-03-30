import React, { useState } from 'react';

const DataTabs = ({ portfolio, logs }) => {
  const [activeTab, setActiveTab] = useState('holdings');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-4 mb-10">
        {[
          { id: 'holdings', label: '当前持仓' },
          { id: 'history', label: '历史成交' },
          { id: 'logs', label: '系统日志' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn-pro h-9 px-6 rounded-2xl text-[10px] font-black transition-all duration-300 uppercase tracking-[0.2em] ${
              activeTab === tab.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 text-text-dim hover:text-white border border-white/5 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'holdings' && (
          <div className="animate-fade-in">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead className="text-white/40 uppercase tracking-[0.2em] sticky top-0 bg-transparent z-10 backdrop-blur-md">
                <tr>
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">证券 SECURITY</th>
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">数量 QTY</th>
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">成本/现价 PRICE</th>
                  <th className="pb-8 px-6 font-black text-right border-b border-white/10 text-xs">盈亏 PNL</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                {(!portfolio.holdings || Object.keys(portfolio.holdings).length === 0) ? (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-white/20 font-black italic tracking-widest">NO ACTIVE POSITIONS</td>
                  </tr>
                ) : (
                  Object.keys(portfolio.holdings).map(sym => {
                    const h = portfolio.holdings[sym];
                    return (
                      <tr key={sym} className="group hover:bg-white/5 transition-all cursor-pointer">
                        <td className="py-8 px-4 border-b border-white/5">
                          <span className="font-black text-white text-lg">{h.name || sym}</span>
                          <br/><small className="text-white/60 font-black tracking-wider text-sm">{sym}</small>
                        </td>
                        <td className="py-8 px-4 font-bold border-b border-white/5 text-lg">{h.shares.toLocaleString()}</td>
                        <td className="py-8 px-4 font-bold border-b border-white/5 text-lg">
                           <span className="text-white/60">¥{h.cost.toFixed(2)}</span>
                           <span className="mx-3 text-white/20">/</span>
                           <span className="text-white">¥{h.price.toFixed(2)}</span>
                        </td>
                        <td className={`py-8 px-4 font-black text-right border-b border-white/5 text-xl ${h.pnl_pct >= 0 ? 'text-up' : 'text-down'}`}>
                           {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead className="text-white/40 uppercase tracking-[0.2em] sticky top-0 bg-transparent z-10 backdrop-blur-md">
                <tr>
                  <th className="pb-8 px-4 font-black border-b border-white/10 text-[11px]">时间 TIME</th>
                  <th className="pb-8 px-4 font-black border-b border-white/10 text-[11px]">标的 ASSET</th>
                  <th className="pb-8 px-4 font-black border-b border-white/10 text-[11px]">类型 TYPE</th>
                  <th className="pb-8 px-4 font-black border-b border-white/10 text-[11px]">价格 PRICE</th>
                  <th className="pb-8 px-4 font-black text-right border-b border-white/10 text-[11px]">结算 VOLUME</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                {(!portfolio.history || portfolio.history.length === 0) ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center text-white/20 font-black italic tracking-widest">NO TRANSACTION HISTORY</td>
                  </tr>
                ) : (
                  [...(portfolio.history || [])].reverse().slice(0, 30).map((h, i) => (
                    <tr key={i} className="group hover:bg-white/5 transition-all">
                      <td className="py-8 px-4 border-b border-white/5"><span className="text-white/40 font-black text-xs">{h.date}</span></td>
                      <td className="py-8 px-4 font-black text-lg border-b border-white/5">{h.name || h.symbol}</td>
                      <td className={`py-8 px-4 font-black border-b border-white/5 ${h.action === 'buy' ? 'text-up' : 'text-down'}`}>
                        <span className={`px-4 py-1.5 rounded-full text-xs ${h.action === 'buy' ? 'bg-up/10' : 'bg-down/10'}`}>
                          {h.action === 'buy' ? '买入' : '卖出'}
                        </span>
                      </td>
                      <td className="py-8 px-4 font-bold border-b border-white/5 text-lg">¥{h.price.toFixed(2)}</td>
                      <td className="py-8 px-4 font-bold text-right border-b border-white/5 text-lg text-white">¥{(h.shares * h.price).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-black/60 rounded-[2.5rem] p-12 font-mono text-sm leading-relaxed min-h-[500px] border-2 border-white/5 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-6 mb-10 text-white/30 font-black tracking-[0.4em] uppercase pb-8 border-b border-white/5">
                <span className="w-3 h-3 rounded-full bg-up animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]"></span>
                SYSTEM TERMINAL MONITOR: READY
            </div>
            {logs.length === 0 ? (
              <div className="py-20 text-center text-white/10 font-black italic tracking-widest uppercase">Initializing kernel... logs clear</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-4 hover:bg-white/5 p-4 rounded-2xl transition-all break-words flex gap-6 group border border-transparent hover:border-white/5">
                  <span className="text-white/20 font-black tabular-nums">[{new Date().toLocaleTimeString()}]</span>
                  <span className="font-bold text-white/80 group-hover:text-white transition-colors">{">> "}{log}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTabs;
