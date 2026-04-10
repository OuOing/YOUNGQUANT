import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

/**
 * TradingChart
 * Props:
 *   symbol, period, zoom
 *   onDataUpdate(lastBar, allData) — 回调最新K线数据给父组件
 */
const TradingChart = ({ symbol, period, zoom = 60, onDataUpdate }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const volumeSeriesRef = useRef();
  const ma5SeriesRef = useRef();
  const ma20SeriesRef = useRef();
  const didFitRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    try {
      setError('');
      const response = await fetch(`/api/indicators?symbol=${symbol}&period=${period}`);
      if (!response.ok) throw new Error('接口请求失败');
      const json = await response.json();
      const data = Array.isArray(json) ? json : (json.data || []);

      if (json.stale && data.length === 0) {
        setError('暂无数据，已触发后台拉取，请稍后刷新');
        setLoading(false);
        return;
      }
      if (!data || data.length === 0) {
        setError('暂无K线数据，请先运行重训流水线');
        setLoading(false);
        return;
      }

      const formattedData = data.map(d => ({
        time: Math.floor(new Date(d.time || d.Date).getTime() / 1000),
        open: parseFloat(d.open || d.Open),
        high: parseFloat(d.high || d.High),
        low: parseFloat(d.low || d.Low),
        close: parseFloat(d.close || d.Close),
      })).filter(d => !isNaN(d.time) && !isNaN(d.close));

      const volumeData = data.map(d => ({
        time: Math.floor(new Date(d.time || d.Date).getTime() / 1000),
        value: parseFloat(d.volume || d.Volume) || 0,
        color: parseFloat(d.close || d.Close) >= parseFloat(d.open || d.Open)
          ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
      })).filter(d => !isNaN(d.time));

      // MA lines
      const ma5Data = data
        .filter(d => d.ma5 != null && !isNaN(d.ma5))
        .map(d => ({ time: Math.floor(new Date(d.time || d.Date).getTime() / 1000), value: parseFloat(d.ma5) }));
      const ma20Data = data
        .filter(d => d.ma20 != null && !isNaN(d.ma20))
        .map(d => ({ time: Math.floor(new Date(d.time || d.Date).getTime() / 1000), value: parseFloat(d.ma20) }));

      candleSeriesRef.current.setData(formattedData);
      volumeSeriesRef.current.setData(volumeData);
      if (ma5SeriesRef.current && ma5Data.length) ma5SeriesRef.current.setData(ma5Data);
      if (ma20SeriesRef.current && ma20Data.length) ma20SeriesRef.current.setData(ma20Data);

      if (!didFitRef.current && chartRef.current) {
        chartRef.current.timeScale().fitContent();
        didFitRef.current = true;
      }

      // 回调最新数据给父组件
      if (onDataUpdate && data.length > 0) {
        onDataUpdate(data[data.length - 1], data);
      }
      setLoading(false);
    } catch (e) {
      console.error('Chart load error:', e);
      setError('数据加载失败：' + e.message);
      setLoading(false);
    }
  }, [symbol, period, onDataUpdate]);

  useEffect(() => {
    didFitRef.current = false;
    setLoading(true);
    setError('');
  }, [symbol, period]);

  useEffect(() => {
    if (!chartRef.current) return;
    const z = Math.max(10, Math.min(100, Number(zoom) || 60));
    chartRef.current.timeScale().applyOptions({ barSpacing: Math.max(3, Math.min(30, 2 + z / 4)) });
  }, [zoom]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    };

    const timer = setTimeout(() => {
      if (!container) return;
      container.innerHTML = '';
      try {
        const chart = createChart(container, {
          layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#64748b', fontSize: 11 },
          grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
          rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)', textColor: '#64748b' },
          timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, rightOffset: 8, secondsVisible: false },
          localization: { locale: 'zh-CN', priceFormatter: p => p.toFixed(2) },
          width: container.clientWidth || 800,
          height: container.clientHeight || 500,
          watermark: { visible: false },
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
          crosshair: { mode: 1 },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#ef4444', downColor: '#10b981',
          borderDownColor: '#10b981', borderUpColor: '#ef4444',
          wickDownColor: '#10b981', wickUpColor: '#ef4444',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' }, priceScaleId: 'vol',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

        const ma5Series = chart.addSeries(LineSeries, {
          color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        });
        const ma20Series = chart.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        ma5SeriesRef.current = ma5Series;
        ma20SeriesRef.current = ma20Series;

        loadData();
      } catch (e) {
        console.error('Chart init error:', e);
        setError('图表初始化失败');
        setLoading(false);
      }
    }, 80);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [loadData]);

  // 智能刷新：交易时段（9:30-15:00 工作日）每15分钟，非交易时段不刷
  useEffect(() => {
    const isTradeTime = () => {
      const now = new Date();
      const day = now.getDay(); // 0=周日 6=周六
      if (day === 0 || day === 6) return false;
      const h = now.getHours(), m = now.getMinutes();
      const afterOpen = h > 9 || (h === 9 && m >= 30);
      const beforeClose = h < 15 || (h === 15 && m === 0);
      return afterOpen && beforeClose;
    };

    const iv = setInterval(() => {
      if (isTradeTime()) loadData();
    }, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, [loadData]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" style={{ touchAction: 'pan-y' }} />

      {/* 加载中 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
            <span className="text-[11px] text-white/30">加载K线数据...</span>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="text-center px-6">
            <p className="text-[11px] text-white/40 mb-3">{error}</p>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="text-[10px] text-secondary border border-secondary/30 px-4 py-1.5 rounded-lg hover:bg-secondary/10 transition-all"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* 图例 */}
      {!loading && !error && (
        <div className="absolute top-3 left-3 flex items-center gap-3 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#f59e0b]" />
            <span className="text-[9px] text-white/30">MA5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#8b5cf6]" />
            <span className="text-[9px] text-white/30">MA20</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingChart;
