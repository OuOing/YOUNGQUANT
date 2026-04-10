import React, { useState, useEffect } from 'react';

/**
 * Leaderboard — 收益率排行榜页面
 * Props: { token }
 */
const Leaderboard = ({ token, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?page=${page}`)
      .then(r => r.json())
      .then(data => setEntries(data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/leaderboard/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setMyRank)
      .catch(() => {});
  }, [token]);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto min-h-screen bg-bg-deep">
      <div className="flex items-center gap-3 flex-nowrap">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 hover:text-white hover:border-secondary/30 transition-all shrink-0 whitespace-nowrap">
            ← 返回
          </button>
        )}
        <h2 className="text-xl font-black text-white whitespace-nowrap">收益率排行榜</h2>
      </div>

      {/* 我的排名 */}
      {myRank && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-[9px] text-white/30 uppercase mb-1">我的排名</p>
            <p className="text-2xl font-black text-teal-400">#{myRank.rank}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-white/30 uppercase mb-1">累计收益率</p>
            <p className={`text-xl font-black ${myRank.return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {myRank.return_pct >= 0 ? '+' : ''}{myRank.return_pct?.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-white/30 uppercase mb-1">最大回撤</p>
            <p className="text-xl font-black text-white">{(myRank.mdd * 100).toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* 排行榜列表 */}
      <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase">排名</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase">用户</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-white/30 uppercase">收益率</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-white/30 uppercase">最大回撤</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="py-8 text-center text-white/30 text-xs">加载中...</td></tr>
            )}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={4} className="py-12 text-center">
                <p className="text-white/30 text-xs mb-2">暂无排行数据</p>
                <p className="text-white/20 text-[10px]">完成注册并进行模拟交易后，你的收益率将出现在这里</p>
              </td></tr>
            )}
            {entries.map((entry, i) => {
              const medal = entry.rank === 1 ? '01' : entry.rank === 2 ? '02' : entry.rank === 3 ? '03' : null;
              const medalColor = entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-white/50' : 'text-amber-600';
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-4 py-3 font-black text-white/60">
                    {medal
                      ? <span className={`text-[10px] font-black tracking-widest ${medalColor}`}>{medal}</span>
                      : <span className="text-white/30">#{entry.rank}</span>
                    }</td>
                  <td className="px-4 py-3 font-black text-white">{entry.name}</td>
                  <td className={`px-4 py-3 text-right font-black ${entry.return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.return_pct >= 0 ? '+' : ''}{entry.return_pct?.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-white/50 text-xs">
                    {(entry.mdd * 100).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 翻页 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-white/5 text-white/40 text-xs font-black rounded-xl disabled:opacity-30 hover:bg-white/10 transition-all"
        >
          ← 上一页
        </button>
        <span className="text-xs text-white/30">第 {page} 页</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={entries.length < 20}
          className="px-4 py-2 bg-white/5 text-white/40 text-xs font-black rounded-xl disabled:opacity-30 hover:bg-white/10 transition-all"
        >
          下一页 →
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
