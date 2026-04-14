import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

/**
 * KLineReplay — K 线历史回放组件
 * Props: { symbol, period }
 */
const KLineReplay = ({ symbol = '601899', period = 'daily' }) => {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const [allData, setAllData] = useState([]);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    fetch(`/api/indicators?symbol=${symbol}&period=${period}`)
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json) ? json : (json.data || []);
        if (!data || data.length === 0) return;
        const formatted = data.map(d => ({
          time: Math.floor(new Date(d.time || d.Date).getTime() / 1000),
          open: parseFloat(d.open), high: parseFloat(d.high),
          low: parseFloat(d.low), close: parseFloat(d.close),
        })).filter(d => !isNaN(d.time) && !isNaN(d.close));
        setAllData(formatted);
        setIndex(Math.min(20, formatted.length));
      })
      .catch(() => {});
  }, [symbol, period]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      width: containerRef.current.clientWidth || 400,
      height: 250,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', downColor: '#10b981',
      borderUpColor: '#ef4444', borderDownColor: '#10b981',
      wickUpColor: '#ef4444', wickDownColor: '#10b981',
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      seriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && chartRef.current && allData.length > 0) {
      try {
        seriesRef.current.setData(allData.slice(0, index));
        chartRef.current?.timeScale().fitContent();
      } catch {}
    }
  }, [index, allData]);

  const step = useCallback(() => {
    setIndex(prev => {
      if (prev >= allData.length) { setPlaying(false); return prev; }
      return prev + 1;
    });
  }, [allData.length]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(step, 1000 / speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, step]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black/20" style={{ height: 250 }} />
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setIndex(i => Math.max(1, i - 1))} className="px-3 py-1.5 bg-white/5 text-white/60 text-xs rounded-xl hover:bg-white/10">◀ 后退</button>
        <button onClick={() => setPlaying(p => !p)} className={`px-4 py-1.5 text-xs font-black rounded-xl ${playing ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'}`}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <div className="flex gap-1">
          {[1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-1 text-[10px] font-black rounded-lg ${speed === s ? 'bg-teal-500 text-black' : 'bg-white/5 text-white/40'}`}>{s}x</button>
          ))}
        </div>
        <span className="text-[10px] text-white/30 ml-auto">{index}/{allData.length}</span>
      </div>
    </div>
  );
};

export default KLineReplay;
