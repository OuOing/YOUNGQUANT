import React, { useState } from 'react';

const DIMENSIONS = [
  { key: 'trend', label: '趋势强度' },
  { key: 'capital', label: '资金净流入' },
  { key: 'sector', label: '板块热度' },
  { key: 'technical', label: '技术指标' },
];

const RISK_COLORS = { '低': 'text-green-400', '中': 'text-yellow-400', '高': 'text-red-400' };

/**
 * StockScreener — AI 选股面板
 * Props: { token, onSelectStock }
 */
const StockScreener = ({ token, onSelectStock }) => {
  const [selected, setSelected] = useState(['trend', 'capital', 'sector', 'technical']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  const handleScreen = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const dims = selected.join(',');
      const res = await fetch(`/api/ai/screener?dimensions=${dims}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.stocks || []);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {DIMENSIONS.map(d => (
          <button
            key={d.key}
            onClick={() => toggle(d.key)}
            className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${selected.includes(d.key) ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' : 'bg-white/5 border-white/10 text-white/40'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <button
        onClick={handleScreen}
        disabled={loading || selected.length === 0 || !token}
        className="py-2 bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-black rounded-xl disabled:opacity-40 hover:bg-teal-500/30 transition-all"
      >
        {!token ? '请先登录' : loading ? 'AI 选股中...' : '开始筛选'}
      </button>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {results.length === 0 && !loading && (
          <p className="text-xs text-white/30 text-center py-4">点击"开始筛选"获取 AI 推荐股票</p>
        )}
        {results.map(stock => (
          <div
            key={stock.symbol}
            onClick={() => onSelectStock?.(stock.symbol)}
            className="flex items-start justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-teal-500/20 cursor-pointer transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-black text-white">{stock.symbol}</span>
                <span className="text-xs text-white/40">{stock.name}</span>
                <span className={`text-[10px] font-black ${RISK_COLORS[stock.risk_level] || 'text-white/40'}`}>
                  {stock.risk_level}风险
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">{stock.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockScreener;
