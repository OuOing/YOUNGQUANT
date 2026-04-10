import React, { useState, useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

// 迷你净值曲线图
const EquityCurve = ({ curve }) => {
  const containerRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!containerRef.current || !curve?.length) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      width: containerRef.current.clientWidth || 500,
      height: 180,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true },
      crosshair: { mode: 1 },
    });

    const strategySeries = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: '策略' });
    const holdSeries = chart.addSeries(LineSeries, { color: 'rgba(255,255,255,0.25)', lineWidth: 1, title: '持有' });

    const toTs = (d) => {
      try { return Math.floor(new Date(d).getTime() / 1000); } catch { return 0; }
    };

    const stratData = curve.map(p => ({ time: toTs(p.date), value: parseFloat(p.strategy) })).filter(p => p.time > 0);
    const holdData = curve.map(p => ({ time: toTs(p.date), value: parseFloat(p.hold) })).filter(p => p.time > 0);

    if (stratData.length) strategySeries.setData(stratData);
    if (holdData.length) holdSeries.setData(holdData);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [curve]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-green-400 rounded" /><span className="text-[10px] text-white/40">策略净值</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-white/25 rounded" /><span className="text-[10px] text-white/40">持有不动</span></div>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" style={{ height: 180 }} />
    </div>
  );
};

const STRATEGIES = [
  {
    id: 'ma_cross',
    name: 'MA 均线金叉',
    tag: '趋势跟踪',
    tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    desc: '当短期均线（MA5）从下方穿越长期均线（MA20）时买入，反向穿越时卖出。适合趋势明显的行情。',
    pros: ['逻辑简单，易于理解', '趋势行情中表现优秀', '可自定义均线周期'],
    cons: ['震荡行情频繁假信号', '信号滞后，入场偏晚'],
    params: [
      { key: 'ma_fast', label: '快线周期', default: 5, min: 5, max: 120 },
      { key: 'ma_slow', label: '慢线周期', default: 20, min: 5, max: 120 },
    ],
  },
  {
    id: 'macd_zero',
    name: 'MACD 零轴穿越',
    tag: '动量策略',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    desc: 'MACD 柱状图从负值穿越零轴时买入，从正值穿越零轴时卖出。捕捉动量转换时机。',
    pros: ['过滤部分噪音', '结合趋势和动量', '适合中长线'],
    cons: ['信号较少', '大幅震荡时可能误判'],
    params: [],
  },
];

const StrategyPage = ({ onBack, token, currentSym }) => {
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useState({});
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!selected) return;
    if (!token) { setError('请先登录后使用回测功能'); return; }
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/backtest/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: currentSym || '601899',
          strategy: selected.id,
          params: { ...selected.params.reduce((a, p) => ({ ...a, [p.key]: p.default }), {}), ...params },
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '回测失败'); return; }
      setResult(data);
    } catch (e) {
      setError(e.message || '网络错误');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 min-h-[calc(100vh-80px)] animate-fade-in bg-bg-deep font-sans">
      <div className="flex items-center gap-3 mb-8 flex-nowrap">
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest shrink-0 whitespace-nowrap">
          ← 返回
        </button>
        <div className="h-4 w-[1px] bg-white/10 shrink-0" />
        <div className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[9px] font-black text-purple-400 uppercase tracking-widest shrink-0">STRATEGY</div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter whitespace-nowrap">量化策略中心</h1>
      </div>

      <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 策略列表 */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">选择策略</p>
          {STRATEGIES.map(s => (
            <div
              key={s.id}
              onClick={() => { setSelected(s); setResult(null); setError(''); }}
              className={`section-card p-4 cursor-pointer transition-all ${selected?.id === s.id ? 'border-secondary/40 bg-secondary/5' : 'hover:border-white/10'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${s.tagColor}`}>{s.tag}</span>
              </div>
              <p className="text-sm font-black text-white">{s.name}</p>
              <p className="text-[11px] text-white/40 mt-1 leading-relaxed line-clamp-2">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 策略详情 + 回测配置 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!selected ? (
            <div className="section-card p-8 flex items-center justify-center text-white/20 text-sm">
              选择左侧策略开始配置
            </div>
          ) : (
            <>
              <div className="section-card p-5">
                <h3 className="text-sm font-black text-white mb-3">{selected.name}</h3>
                <p className="text-xs text-white/60 leading-relaxed mb-4">{selected.desc}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-green-400 uppercase tracking-widest mb-1">优势</p>
                    {selected.pros.map((p, i) => <p key={i} className="text-[11px] text-white/50 flex items-start gap-1"><span className="text-green-400 mt-0.5">+</span>{p}</p>)}
                  </div>
                  <div>
                    <p className="text-[9px] text-red-400 uppercase tracking-widest mb-1">局限</p>
                    {selected.cons.map((c, i) => <p key={i} className="text-[11px] text-white/50 flex items-start gap-1"><span className="text-red-400 mt-0.5">-</span>{c}</p>)}
                  </div>
                </div>
              </div>

              <div className="section-card p-5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">回测配置</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">开始日期</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">结束日期</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary/50" />
                  </div>
                </div>
                {selected.params.map(p => (
                  <div key={p.key} className="mb-3">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">{p.label}（{p.min}-{p.max}）</label>
                    <input type="number" min={p.min} max={p.max} defaultValue={p.default}
                      onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary/50" />
                  </div>
                ))}
                {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
                <button onClick={handleRun} disabled={running}
                  className="w-full py-2.5 bg-secondary/20 border border-secondary/30 text-secondary text-xs font-black rounded-xl disabled:opacity-40 hover:bg-secondary/30 transition-all">
                  {running ? '回测运行中...' : '运行回测'}
                </button>
              </div>

              {result && (
                <div className="section-card p-5">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">回测结果</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {[
                      { label: '年化收益', value: `${((result.metrics?.annual_return || 0) * 100).toFixed(2)}%`, color: (result.metrics?.annual_return || 0) >= 0 ? 'text-up' : 'text-down' },
                      { label: '最大回撤', value: `-${((result.metrics?.max_drawdown || 0) * 100).toFixed(2)}%`, color: 'text-down' },
                      { label: '胜率', value: `${((result.metrics?.win_rate || 0) * 100).toFixed(1)}%`, color: 'text-secondary' },
                      { label: '夏普比率', value: (result.metrics?.sharpe || 0).toFixed(2), color: 'text-white' },
                    ].map(m => (
                      <div key={m.label} className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
                        <p className="text-[9px] text-white/30 uppercase mb-1">{m.label}</p>
                        <p className={`text-sm font-black ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {result.curve?.length > 0 && <EquityCurve curve={result.curve} />}
                  <p className="text-[10px] text-white/20 mt-3 text-center">共 {result.metrics?.total_trades || 0} 笔交易 · 数据仅供参考，不构成投资建议</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyPage;
