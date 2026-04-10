import React, { useState, useEffect } from 'react';

/**
 * ReviewReport — AI 复盘报告组件
 * Props: { tradeId, token, onClose }
 */
const ReviewReport = ({ tradeId, token, onClose }) => {
  const [tradeReport, setTradeReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('trade');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      tradeId ? fetch(`/api/ai/review/${tradeId}`, { headers }).then(r => r.json()) : Promise.resolve(null),
      fetch('/api/ai/review/summary?period=week', { headers }).then(r => r.json()),
    ]).then(([trade, sum]) => {
      setTradeReport(trade);
      setSummary(sum);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tradeId, token]);

  const SCORE_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-teal-400', 'text-green-400'];

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {tradeId && <button onClick={() => setTab('trade')} className={`px-3 py-1 text-xs font-black rounded-lg ${tab === 'trade' ? 'bg-teal-500 text-black' : 'bg-white/5 text-white/40'}`}>单笔复盘</button>}
          <button onClick={() => setTab('summary')} className={`px-3 py-1 text-xs font-black rounded-lg ${tab === 'summary' ? 'bg-teal-500 text-black' : 'bg-white/5 text-white/40'}`}>周度综合</button>
        </div>
        {onClose && <button onClick={onClose} className="text-white/30 hover:text-white text-xs">关闭</button>}
      </div>

      {loading && <p className="text-xs text-white/40 text-center py-8">AI 复盘分析中...</p>}

      {!loading && tab === 'trade' && tradeReport && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">操作评分</span>
            <span className={`text-2xl font-black ${SCORE_COLORS[tradeReport.score] || 'text-white'}`}>
              {tradeReport.score}/5
            </span>
          </div>
          {[
            { label: '入场时机', value: tradeReport.entry_timing },
            { label: '持仓时长', value: tradeReport.hold_duration },
            { label: '盈亏归因', value: tradeReport.pnl_attribution },
          ].map(item => (
            <div key={item.label} className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/30 uppercase mb-1">{item.label}</p>
              <p className="text-xs text-white/70">{item.value}</p>
            </div>
          ))}
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
            <p className="text-[10px] text-teal-400 uppercase mb-1">改进建议</p>
            <p className="text-xs text-white/70">{tradeReport.suggestion}</p>
          </div>
        </div>
      )}

      {!loading && tab === 'summary' && summary && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '胜率', value: `${((summary.win_rate || 0) * 100).toFixed(1)}%` },
              { label: '平均持股', value: `${(summary.avg_hold_days || 0).toFixed(1)}天` },
              { label: '最大盈利', value: `¥${(summary.max_profit || 0).toFixed(0)}` },
              { label: '最大亏损', value: `¥${(summary.max_loss || 0).toFixed(0)}` },
            ].map(m => (
              <div key={m.label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[9px] text-white/30 uppercase">{m.label}</p>
                <p className="text-sm font-black text-white">{m.value}</p>
              </div>
            ))}
          </div>
          {summary.common_patterns?.length > 0 && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/30 uppercase mb-2">常见交易模式</p>
              {summary.common_patterns.map((p, i) => (
                <span key={i} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] rounded-lg">{p}</span>
              ))}
            </div>
          )}
          {summary.diagnosis && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
              <p className="text-[10px] text-teal-400 uppercase mb-1">综合诊断</p>
              <p className="text-xs text-white/70">{summary.diagnosis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewReport;
