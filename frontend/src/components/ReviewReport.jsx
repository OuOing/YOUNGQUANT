import React, { useState, useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

// 迷你 K 线图，标注买卖点
const TradeMiniChart = ({ symbol, buyDate, buyPrice, sellDate, sellPrice }) => {
  const containerRef = useRef();

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    const container = containerRef.current;

    fetch(`/api/indicators?symbol=${symbol}&period=daily`)
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json) ? json : (json.data || []);
        if (!data.length) return;

        const chart = createChart(container, {
          layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
          grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
          width: container.clientWidth || 400,
          height: 160,
          timeScale: { timeVisible: true },
          rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#ef4444', downColor: '#10b981',
          borderUpColor: '#ef4444', borderDownColor: '#10b981',
          wickUpColor: '#ef4444', wickDownColor: '#10b981',
        });

        const formatted = data.map(d => ({
          time: Math.floor(new Date(d.time).getTime() / 1000),
          open: parseFloat(d.open), high: parseFloat(d.high),
          low: parseFloat(d.low), close: parseFloat(d.close),
        })).filter(d => !isNaN(d.time));

        series.setData(formatted);

        // 标注买卖点
        const markers = [];
        if (buyDate) {
          const ts = Math.floor(new Date(buyDate).getTime() / 1000);
          markers.push({ time: ts, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: `买¥${buyPrice?.toFixed(2)}`, size: 2 });
        }
        if (sellDate) {
          const ts = Math.floor(new Date(sellDate).getTime() / 1000);
          markers.push({ time: ts, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: `卖¥${sellPrice?.toFixed(2)}`, size: 2 });
        }
        if (markers.length) {
          markers.sort((a, b) => a.time - b.time);
          try { series.setMarkers(markers); } catch {}
        }

        chart.timeScale().fitContent();
        return () => chart.remove();
      })
      .catch(() => {});
  }, [symbol, buyDate, sellDate]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black/20" style={{ height: 160 }} />;
};

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
          {/* 迷你 K 线图标注买卖点 */}
          <TradeMiniChart
            symbol={tradeReport.symbol}
            buyDate={tradeReport.buy_date}
            buyPrice={tradeReport.buy_price}
            sellDate={tradeReport.date}
            sellPrice={tradeReport.price}
          />
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
