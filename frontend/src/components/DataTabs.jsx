import React, { useState } from 'react';
import HelpTooltip from './HelpTooltip';
import PortfolioChart from './PortfolioChart';
import ReviewReport from './ReviewReport';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="py-8 px-4 border-b border-white/5">
      <div className="h-6 w-32 bg-white/5 rounded-lg mb-2" />
      <div className="h-4 w-16 bg-white/5 rounded-md" />
    </td>
    <td className="py-8 px-4 border-b border-white/5">
      <div className="h-8 w-20 bg-white/5 rounded-xl" />
    </td>
    <td className="py-8 px-4 border-b border-white/5">
      <div className="h-8 w-40 bg-white/5 rounded-xl" />
    </td>
    <td className="py-8 px-4 border-b border-white/5 text-right">
      <div className="h-10 w-24 bg-white/5 rounded-2xl ml-auto" />
    </td>
  </tr>
);

const SkeletonHistoryRow = () => (
  <tr className="animate-pulse">
    <td className="py-8 px-4 border-b border-white/5"><div className="h-4 w-24 bg-white/5 rounded" /></td>
    <td className="py-8 px-4 border-b border-white/5"><div className="h-6 w-32 bg-white/5 rounded" /></td>
    <td className="py-8 px-4 border-b border-white/5"><div className="h-7 w-16 bg-white/5 rounded-full" /></td>
    <td className="py-8 px-4 border-b border-white/5"><div className="h-6 w-20 bg-white/5 rounded" /></td>
    <td className="py-8 px-4 border-b border-white/5 text-right"><div className="h-6 w-28 bg-white/5 rounded ml-auto" /></td>
  </tr>
);

const DataTabs = ({ portfolio, portfolioLoading, logs, token }) => {
  const [activeTab, setActiveTab] = useState('holdings');
  const [reviewTradeId, setReviewTradeId] = useState(null);

  const handleTabChange = (id) => {
    setActiveTab(id);
    // 标记"查看资产明细"新手任务
    if (!localStorage.getItem('yq_task_check_portfolio')) {
      localStorage.setItem('yq_task_check_portfolio', '1');
    }
  };

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-4 mb-10">
        {[
          { id: 'holdings', label: '当前持仓' },
          { id: 'history', label: '历史成交' },
          { id: 'equity', label: '净值曲线' },
          { id: 'logs', label: '系统日志' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">
                    证券 SECURITY
                    <HelpTooltip title="标的代码" text="上市公司在交易所的唯一身份代码与简称。" />
                  </th>
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">
                    数量 QTY
                    <HelpTooltip title="持股数量" text="当前账户中持有该股票的总股数。" />
                  </th>
                  <th className="pb-8 px-6 font-black border-b border-white/10 text-xs">
                    成本/现价 PRICE
                    <HelpTooltip title="价格对比" text="买入时的加权平均成本价与当前市场实时成交价。" />
                  </th>
                  <th className="pb-8 px-6 font-black text-right border-b border-white/10 text-xs">
                    盈亏 PNL
                    <HelpTooltip title="浮动盈亏" text="基于当前市价计算的账户未实现盈亏及百分比。" />
                  </th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                {portfolioLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : (!portfolio.holdings || Object.keys(portfolio.holdings).length === 0) ? (
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
                {portfolioLoading ? (
                  <>
                    <SkeletonHistoryRow />
                    <SkeletonHistoryRow />
                    <SkeletonHistoryRow />
                  </>
                ) : (!portfolio.history || portfolio.history.length === 0) ? (
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
                      <td className="py-8 px-4 font-bold text-right border-b border-white/5 text-lg text-white">
                        <div className="flex items-center justify-end gap-3">
                          <span>¥{(h.shares * h.price).toLocaleString()}</span>
                          {h.action === 'sell' && token && (
                            <button
                              onClick={() => setReviewTradeId(h.id || i)}
                              className="px-3 py-1 text-[10px] font-black bg-secondary/10 border border-secondary/20 text-secondary rounded-lg hover:bg-secondary/20 transition-all whitespace-nowrap"
                            >
                              AI 复盘
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'equity' && (
          <div className="animate-fade-in p-2">
            <PortfolioChart token={token} />
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

    {/* ReviewReport Modal */}
    {reviewTradeId !== null && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" onClick={() => setReviewTradeId(null)}></div>
        <div className="section-card w-full max-w-lg relative z-10 p-8 bg-bg-deep/90 border-secondary/20 shadow-2xl">
          <ReviewReport
            tradeId={reviewTradeId}
            token={token}
            onClose={() => setReviewTradeId(null)}
          />
        </div>
      </div>
    )}
    </>
  );
};

export default DataTabs;
