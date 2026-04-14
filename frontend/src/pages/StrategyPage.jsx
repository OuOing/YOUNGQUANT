import React, { useState, useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';
import TermTooltip from '../components/TermTooltip.jsx';

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
    const toTs = (d) => { try { return Math.floor(new Date(d).getTime() / 1000); } catch { return 0; } };
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
    difficulty: '入门',
    desc: '当短期均线（MA5）从下方穿越长期均线（MA20）时买入，反向穿越时卖出。适合趋势明显的行情。',
    principle: 'MA 均线是一段时间内收盘价的平均值。短期均线反应快，长期均线反应慢。当短期均线上穿长期均线（金叉），说明近期价格涨势超过长期趋势，是买入信号；反之（死叉）是卖出信号。',
    suitable: '单边上涨或下跌的趋势行情，不适合震荡市',
    pros: ['逻辑简单，易于理解', '趋势行情中表现优秀', '可自定义均线周期', '适合初学者入门'],
    cons: ['震荡行情频繁假信号', '信号滞后，入场偏晚', '需要配合成交量确认'],
    params: [
      { key: 'ma_fast', label: '快线周期', default: 5, min: 5, max: 120, hint: '短期均线，越小越灵敏' },
      { key: 'ma_slow', label: '慢线周期', default: 20, min: 5, max: 120, hint: '长期均线，越大越稳定' },
    ],
    tips: ['快线周期建议 5-10，慢线建议 20-60', '两条均线差距越大，信号越强', '配合成交量放大确认有效性'],
  },
  {
    id: 'macd_zero',
    name: 'MACD 零轴穿越',
    tag: '动量策略',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    difficulty: '进阶',
    desc: 'MACD 柱状图从负值穿越零轴时买入，从正值穿越零轴时卖出。捕捉动量转换时机。',
    principle: 'MACD 由快速 EMA 减去慢速 EMA 计算得出，反映价格动量变化。当 MACD 柱从负转正（穿越零轴），说明短期动量由弱转强，是趋势转变的重要信号，比普通金叉更可靠。',
    suitable: '中长线趋势转换，适合耐心等待信号的投资者',
    pros: ['过滤部分噪音', '结合趋势和动量', '适合中长线', '信号相对可靠'],
    cons: ['信号较少，可能错过机会', '大幅震荡时可能误判', '参数调整影响较大'],
    params: [],
    tips: ['MACD 零轴穿越比金叉死叉更可靠', '配合 RSI 超卖区域效果更好', '适合日线级别操作'],
  },
  {
    id: 'rsi_reversal',
    name: 'RSI 超买超卖',
    tag: '反转策略',
    tagColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    difficulty: '入门',
    desc: 'RSI 指标低于 30（超卖）时买入，高于 70（超买）时卖出。适合震荡行情中的高抛低吸。',
    principle: 'RSI（相对强弱指数）衡量价格涨跌的速度和幅度，范围 0-100。RSI < 30 说明价格跌幅过大、超卖，可能反弹；RSI > 70 说明价格涨幅过大、超买，可能回调。',
    suitable: '横盘震荡行情，不适合单边趋势市',
    pros: ['震荡行情效果好', '信号明确，易于执行', '可以高抛低吸', '适合短线操作'],
    cons: ['趋势行情中会频繁止损', '超买超卖可能持续很久', '需要结合趋势判断'],
    params: [
      { key: 'rsi_period', label: 'RSI 周期', default: 14, min: 5, max: 30, hint: '计算 RSI 的周期，默认 14' },
      { key: 'rsi_oversold', label: '超卖阈值', default: 30, min: 10, max: 40, hint: '低于此值视为超卖，买入' },
      { key: 'rsi_overbought', label: '超买阈值', default: 70, min: 60, max: 90, hint: '高于此值视为超买，卖出' },
    ],
    tips: ['RSI 14 是最常用的参数', '超卖阈值 20-30，超买阈值 70-80', '强趋势中 RSI 可能长期维持极值'],
  },
  {
    id: 'bollinger_breakout',
    name: '布林带突破',
    tag: '波动率策略',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    difficulty: '进阶',
    desc: '价格突破布林带上轨时买入，跌破下轨时卖出。利用价格波动率扩张捕捉突破行情。',
    principle: '布林带由中轨（20日均线）和上下轨（中轨 ± 2倍标准差）组成。价格突破上轨说明波动率扩张、多方强势；跌破下轨说明空方强势。突破后往往有一段持续行情。',
    suitable: '波动率扩张的突破行情，不适合窄幅震荡',
    pros: ['自适应市场波动率', '突破信号明确', '可以捕捉大行情', '结合成交量效果好'],
    cons: ['假突破较多', '需要严格止损', '震荡市频繁进出'],
    params: [
      { key: 'bb_period', label: '布林带周期', default: 20, min: 10, max: 50, hint: '中轨均线周期，默认 20' },
      { key: 'bb_std', label: '标准差倍数', default: 2, min: 1, max: 3, hint: '上下轨距中轨的标准差倍数' },
    ],
    tips: ['标准差 2 是最常用参数', '突破时成交量需放大确认', '可以用中轨作为止损参考'],
  },
  {
    id: 'dual_ma',
    name: '双均线系统',
    tag: '趋势跟踪',
    tagColor: 'text-green-400 bg-green-500/10 border-green-500/20',
    difficulty: '入门',
    desc: '使用 MA20 和 MA60 两条均线，MA20 上穿 MA60 买入，下穿卖出。适合中长线趋势跟踪。',
    principle: '双均线系统使用中期（20日）和长期（60日）均线。MA20 代表一个月趋势，MA60 代表一个季度趋势。两者金叉说明中期趋势转强，是中长线买入信号，信号比 MA5/MA20 更稳定。',
    suitable: '中长线趋势行情，适合不频繁操作的投资者',
    pros: ['信号稳定，假信号少', '适合中长线持有', '减少频繁交易', '顺势而为'],
    cons: ['信号滞后较多', '短期波动中可能错过', '需要较长持仓周期'],
    params: [
      { key: 'ma_fast', label: '中期均线', default: 20, min: 10, max: 60, hint: '中期趋势参考，建议 20-30' },
      { key: 'ma_slow', label: '长期均线', default: 60, min: 30, max: 120, hint: '长期趋势参考，建议 60-120' },
    ],
    tips: ['MA20/MA60 是经典中长线组合', '适合持仓 1-3 个月', '配合基本面分析效果更好'],
  },
];

const DIFFICULTY_COLOR = {
  '入门': 'text-green-400 bg-green-500/10 border-green-500/20',
  '进阶': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  '高级': 'text-red-400 bg-red-500/10 border-red-500/20',
};

const StrategyPage = ({ onBack, token, currentSym }) => {
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useState({});
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'principle'

  const handleRun = async () => {
    if (!selected) return;
    if (!token) { setError('请先登录后使用回测功能'); return; }
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const mergedParams = {
        ...selected.params.reduce((a, p) => ({ ...a, [p.key]: p.default }), {}),
        ...params,
      };
      const res = await fetch('/api/backtest/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: currentSym || '601899',
          strategy: selected.id,
          params: mergedParams,
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
        <span className="text-[10px] text-white/30 ml-2">{STRATEGIES.length} 个策略 · 可自定义参数回测</span>
      </div>

      <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 策略列表 */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">选择策略</p>
          {STRATEGIES.map(s => (
            <div
              key={s.id}
              onClick={() => { setSelected(s); setResult(null); setError(''); setParams({}); setActiveTab('config'); }}
              className={`section-card p-4 cursor-pointer transition-all ${selected?.id === s.id ? 'border-secondary/40 bg-secondary/5' : 'hover:border-white/10'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${s.tagColor}`}>{s.tag}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${DIFFICULTY_COLOR[s.difficulty]}`}>{s.difficulty}</span>
              </div>
              <p className="text-sm font-black text-white">{s.name}</p>
              <p className="text-[11px] text-white/40 mt-1 leading-relaxed line-clamp-2">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 右侧详情 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!selected ? (
            <div className="section-card p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/20">
                  <path d="M3 14l4-4 3 3 4-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-black text-white/30">选择左侧策略开始配置</p>
                <p className="text-[11px] text-white/20 mt-1">共 {STRATEGIES.length} 个量化策略，支持自定义参数回测</p>
              </div>
              {/* 策略对比表 */}
              <div className="w-full mt-4 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 gap-0 text-[9px] font-black text-white/30 uppercase tracking-widest px-4 py-2 border-b border-white/5">
                  <span>策略</span><span className="text-center">类型</span><span className="text-center">难度</span><span className="text-center">适合行情</span>
                </div>
                {STRATEGIES.map(s => (
                  <div key={s.id} onClick={() => { setSelected(s); setResult(null); setError(''); setParams({}); }}
                    className="grid grid-cols-4 gap-0 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-all">
                    <span className="text-xs font-black text-white/70">{s.name}</span>
                    <span className={`text-[10px] font-black text-center ${s.tagColor.split(' ')[0]}`}>{s.tag}</span>
                    <span className={`text-[10px] font-black text-center ${DIFFICULTY_COLOR[s.difficulty].split(' ')[0]}`}>{s.difficulty}</span>
                    <span className="text-[10px] text-white/30 text-center truncate">{s.suitable?.split('，')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 标签切换 */}
              <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 w-fit">
                {[{ key: 'config', label: '回测配置' }, { key: 'principle', label: '策略原理' }].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-1.5 text-xs font-black rounded-xl transition-all ${activeTab === t.key ? 'bg-secondary text-black' : 'text-white/40 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'principle' && (
                <div className="section-card p-5 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${selected.tagColor}`}>{selected.tag}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${DIFFICULTY_COLOR[selected.difficulty]}`}>{selected.difficulty}</span>
                    </div>
                    <h3 className="text-base font-black text-white mb-2">{selected.name}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      <TermTooltip text={selected.principle} />
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5">适合行情</p>
                    <p className="text-xs text-white/60">{selected.suitable}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] text-green-400 uppercase tracking-widest mb-2">优势</p>
                      <div className="flex flex-col gap-1">
                        {selected.pros.map((p, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-green-400/60 mt-1.5 shrink-0" />
                            <p className="text-[11px] text-white/50">{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-red-400 uppercase tracking-widest mb-2">局限</p>
                      <div className="flex flex-col gap-1">
                        {selected.cons.map((c, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-red-400/60 mt-1.5 shrink-0" />
                            <p className="text-[11px] text-white/50">{c}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selected.tips?.length > 0 && (
                    <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                      <p className="text-[9px] text-secondary uppercase tracking-widest mb-2">使用建议</p>
                      <div className="flex flex-col gap-1">
                        {selected.tips.map((t, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-secondary/60 mt-1.5 shrink-0" />
                            <p className="text-[11px] text-white/50">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'config' && (
                <>
                  <div className="section-card p-5">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">回测配置</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">标的股票</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-secondary font-black">
                          {currentSym || '601899'}
                        </div>
                      </div>
                      <div />
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

                    {selected.params.length > 0 && (
                      <div className="border-t border-white/5 pt-3 mb-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">策略参数</p>
                        <div className="grid grid-cols-2 gap-3">
                          {selected.params.map(p => (
                            <div key={p.key}>
                              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">
                                {p.label} <span className="text-white/20 normal-case">({p.min}-{p.max})</span>
                              </label>
                              <input type="number" min={p.min} max={p.max} defaultValue={p.default}
                                onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary/50" />
                              {p.hint && <p className="text-[9px] text-white/25 mt-0.5">{p.hint}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
                    <button onClick={handleRun} disabled={running}
                      className="w-full py-2.5 bg-secondary/20 border border-secondary/30 text-secondary text-xs font-black rounded-xl disabled:opacity-40 hover:bg-secondary/30 transition-all">
                      {running ? '回测运行中...' : `运行回测 · ${currentSym || '601899'}`}
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
                      <p className="text-[10px] text-white/20 mt-3 text-center">
                        共 {result.metrics?.total_trades || 0} 笔交易 · 数据仅供参考，不构成投资建议
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyPage;
