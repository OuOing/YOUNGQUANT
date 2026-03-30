import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

const TradingChart = ({ symbol, period }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const volumeSeriesRef = useRef();

  const loadData = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    try {
      const response = await fetch(`/api/indicators?symbol=${symbol}&period=${period}`);
      const data = await response.json();
      if (!data || data.length === 0) return;
      
      const formattedData = data.map(d => ({
        time: Math.floor(new Date(d.time || d.Date).getTime() / 1000),
        open: parseFloat(d.open || d.Open),
        high: parseFloat(d.high || d.High),
        low: parseFloat(d.low || d.Low),
        close: parseFloat(d.close || d.Close),
      }));

      const volumeData = data.map(d => ({
        time: Math.floor(new Date(d.time || d.Date).getTime() / 1000),
        value: parseFloat(d.volume || d.Volume),
        color: parseFloat(d.close || d.Close) >= parseFloat(d.open || d.Open) ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      }));

      candleSeriesRef.current.setData(formattedData);
      volumeSeriesRef.current.setData(volumeData);
      
      chartRef.current.timeScale().fitContent();
    } catch (e) {
      console.error("Failed to load chart data:", e);
    }
  }, [symbol, period]);

  useEffect(() => {
    let chart;
    const container = chartContainerRef.current;
    if (!container) return;

    const handleResize = () => {
        if (chartRef.current && container) {
            chartRef.current.applyOptions({ 
                width: container.clientWidth,
                height: container.clientHeight
            });
        }
    };

    // Use a small timeout to ensure DOM is ready and size is calculated
    const timer = setTimeout(() => {
        if (!container) return;
        
        // Clear previous content
        container.innerHTML = '';

        try {
            chart = createChart(container, {
                layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
                grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
                rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
                timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true, rightOffset: 5 },
                localization: { locale: 'zh-CN', priceFormatter: p => p.toFixed(2) },
                width: container.clientWidth || 600,
                height: container.clientHeight || 400,
            });

            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#ef4444', downColor: '#10b981', 
                borderDownColor: '#10b981', borderUpColor: '#ef4444', 
                wickDownColor: '#10b981', wickUpColor: '#ef4444'
            });

            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: 'rgba(255, 255, 255, 0.1)', priceFormat: { type: 'volume' }, priceScaleId: ''
            });

            volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

            chartRef.current = chart;
            candleSeriesRef.current = candleSeries;
            volumeSeriesRef.current = volumeSeries;
            
            loadData();
        } catch (e) {
            console.error("Critical Chart init failure:", e);
        }
    }, 100);

    window.addEventListener('resize', handleResize);

    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }
    };
  }, [loadData]);

  return <div ref={chartContainerRef} className="w-full h-full relative min-h-[300px]" />;
};

export default TradingChart;
