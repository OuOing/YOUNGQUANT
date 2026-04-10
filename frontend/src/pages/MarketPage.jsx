import React, { useState, useEffect } from 'react';

const MarketPage = ({ onSelectStock, onBack }) => {
  const [hotStocks, setHotStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/market/hot-stocks').then(r => r.json()),
      fetch('/api/market/sectors').then(r => r.json()),
    ]).then(([hot, sec]) => {
      setHotStocks(hot.stocks || []);
      setSectors(sec.sectors || []);
      setLastUpdated(new Date());
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 min-h-[calc(100vh-80px)] animate-fade-in bg-bg-deep font-sans">
      <div className="flex items-center gap-3 mb-8 flex-nowrap">
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest shrink-0 whitespace-nowrap">
          ← 返回
        </button>
        <div className="h-4 w-[1px] bg-white/10 shrink-0" />
        <div className="inline-block px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-[9px] font-black text-secondary uppercase tracking-widest shrink-0">MARKET</div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter whitespace-nowrap">市场行情总览</h1>
        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[9px] text-white/20">更新于 {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white/40 hover:text-white hover:border-secondary/30 transition-all disabled:opacity-30"
          >
            {loading ? '刷新中...' : '↻ 刷新'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
        {/* 热门股票 */}
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white uppercase tracking-tight">热门股票排行</h2>
            <span className="text-[9px] text-white/30 uppercase">按涨跌幅排序</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-white/20 text-xs">加载中...</div>
          ) : hotStocks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/20 text-xs mb-1">暂无行情数据</p>
              <p className="text-white/15 text-[10px]">请先在主页点击「更新 AI 信号」拉取最新数据</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hotStocks.map((stock, i) => {
                const pct = stock.change_pct || 0;
                return (
                  <div
                    key={stock.symbol}
                    onClick={() => { onSelectStock?.(stock.symbol); onBack?.(); }}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-secondary/20 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white/20 w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-black text-white group-hover:text-secondary transition-colors">{stock.name || stock.symbol}</p>
                        <p className="text-[10px] text-white/30">{stock.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">¥{(stock.close || 0).toFixed(2)}</p>
                      <p className={`text-[10px] font-black ${pct >= 0 ? 'text-up' : 'text-down'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 板块热度 */}
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white uppercase tracking-tight">板块热度排行</h2>
            <span className="text-[9px] text-white/30 uppercase">实时更新</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-white/20 text-xs">加载中...</div>
          ) : sectors.length === 0 ? (
            <div className="py-8 text-center text-white/20 text-xs">暂无板块数据</div>
          ) : (
            <div className="flex flex-col gap-3">
              {sectors.map((sec, i) => {
                const pct = sec.change_pct || 0;
                const barWidth = Math.min(100, Math.abs(pct) * 10);
                return (
                  <div key={sec.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                        <span className="text-sm font-black text-white">{sec.name}</span>
                        {sec.leader_name && (
                          <span className="text-[9px] text-white/30">龙头：{sec.leader_name}</span>
                        )}
                      </div>
                      <span className={`text-sm font-black ${pct >= 0 ? 'text-up' : 'text-down'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 0 ? 'bg-up' : 'bg-down'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 市场统计 */}
        <div className="section-card p-6 lg:col-span-2">
          <h2 className="text-sm font-black text-white uppercase tracking-tight mb-4">市场规则速查</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '交易时间', value: '9:30 - 15:00', sub: '周一至周五' },
              { label: '涨跌停限制', value: '±10%', sub: '主板（科创/创业板 ±20%）' },
              { label: '最小交易单位', value: '100 股/手', sub: '买入须为100的整数倍' },
              { label: '结算制度', value: 'T+1', sub: '当日买入次日可卖' },
            ].map(item => (
              <div key={item.label} className="bg-white/5 border border-white/5 rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm font-black text-white">{item.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
