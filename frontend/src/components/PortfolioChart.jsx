import React, { useState, useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

/**
 * PortfolioChart — 账户净值曲线图
 * Props: { token }
 */
const PortfolioChart = ({ token }) => {
  const [range, setRange] = useState('all');
  const [metrics, setMetrics] = useState({ mdd: 0, sharpe: 0, win_rate: 0 });
  const [hasData, setHasData] = useState(true);
  const containerRef = useRef();
  const chartRef = useRef();
  const strategySeriesRef = useRef();

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const chart = createChart(container, {
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      width: container.clientWidth || 400,
      height: 200,
      timeScale: { timeVisible: true },
    });
    const series = chart.addSeries(LineSeries, { color: '#14b8a6', lineWidth: 2 });
    chartRef.current = chart;
    strategySeriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/portfolio?range=${range}`, { headers })
      .then(r => r.json())
      .then(data => {
        const history = data.equity_history || [];
        if (strategySeriesRef.current && history.length > 0) {
          const chartData = history.map(p => ({
            time: p.date,
            value: parseFloat(p.value) || 0,
          })).filter(p => p.time && p.value > 0);
          if (chartData.length > 0) {
            strategySeriesRef.current.setData(chartData);
            chartRef.current?.timeScale().fitContent();
          }
        }
        if (data.metrics) {
          setMetrics({
            mdd: data.metrics.mdd || 0,
            sharpe: data.metrics.sharpe || 0,
            win_rate: data.metrics.win_rate || 0,
          });
        }
        setHasData(history.length > 0);
      })
      .catch(() => {});
  }, [range, token]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[['7d', '近7日'], ['30d', '近30日'], ['all', '全部']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setRange(v)}
            className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${range === v ? 'bg-teal-500 text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black/20 relative" style={{ height: 200 }}>
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-white/30 mb-1">暂无净值数据</p>
            <p className="text-[10px] text-white/20">完成第一笔卖出交易后，净值曲线将在此显示</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '最大回撤', value: `${(metrics.mdd * 100).toFixed(2)}%` },
          { label: '夏普比率', value: metrics.sharpe.toFixed(2) },
          { label: '胜率', value: `${(metrics.win_rate * 100).toFixed(1)}%` },
        ].map(m => (
          <div key={m.label} className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[9px] text-white/30 uppercase">{m.label}</p>
            <p className="text-sm font-black text-white">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioChart;
