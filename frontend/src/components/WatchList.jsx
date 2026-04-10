import React, { useState, useEffect } from 'react';

/**
 * WatchList — 自选股管理组件
 * Props: { token, onSelectStock }
 */
const WatchList = ({ token, onSelectStock }) => {
  const [list, setList] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchList = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/watchlist', { headers });
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  useEffect(() => { fetchList(); }, [token]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    setError('');
    const res = await fetch('/api/watchlist', { method: 'POST', headers, body: JSON.stringify({ symbol: input.trim() }) });
    if (res.ok) { setInput(''); await fetchList(); }
    else {
      const data = await res.json();
      setError(data.error || '添加失败');
    }
  };

  const handleDelete = async (symbol) => {
    await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE', headers });
    await fetchList();
  };

  if (!token) return <div className="p-4 text-center text-white/40 text-sm">请先登录</div>;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
          placeholder="输入股票代码（如 601899）"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="px-4 py-2 bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-black rounded-xl hover:bg-teal-500/30 transition-all">
          添加
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {list.length === 0 && <p className="text-xs text-white/30 text-center py-4">暂无自选股</p>}
        {list.map(item => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/5 rounded-xl hover:border-teal-500/20 transition-all">
            <button onClick={() => onSelectStock?.(item.symbol)} className="text-sm font-black text-white hover:text-teal-400 transition-colors">
              {item.symbol}
            </button>
            <button onClick={() => handleDelete(item.symbol)} className="text-[10px] text-red-400/60 hover:text-red-400">删除</button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/20 text-right">{list.length}/50</p>
    </div>
  );
};

export default WatchList;
