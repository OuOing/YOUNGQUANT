import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, BarChart3, MessageSquare, TrendingUp, Activity, 
  PieChart, Menu, Search, RefreshCw, ChevronDown, CheckCircle2,
  LogOut, Settings, UserCircle2, Sparkles, ShieldCheck
} from 'lucide-react';

// Functional Components
import TradingChart from './components/TradingChart';
import ChatTerminal from './components/ChatTerminal';
import TradePanel from './components/TradePanel';
import DataTabs from './components/DataTabs';
import AuthModal from './components/AuthModal';
import TutorialModal from './components/TutorialModal';

const stocks = { 
  '601899': '紫金矿业', '600519': '贵州茅台', '000001': '平安银行', '600036': '招商银行', 
  '300750': '宁德时代', '601318': '中国平安', '000858': '五粮液', '600900': '长江电力' 
};

// UI Components
const AILogo = () => (
  <div className="relative flex items-center justify-center">
    <div className="w-7 h-7 bg-bg-card border border-border rounded-lg flex items-center justify-center relative z-10 shadow-md">
       <Sparkles size={14} className="text-secondary" />
    </div>
  </div>
);

const Header = ({
  currentSym,
  period,
  refreshing,
  onRefreshPipeline,
  onSelectStock,
  user,
  onOpenAuth,
  onOpenTutorial,
  onLogout
}) => {
  const [searchTerm, setSearchTerm] = useState(currentSym);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  useEffect(() => {
    setSearchTerm(currentSym);
  }, [currentSym]);

  useEffect(() => {
    const term = (searchTerm || '').trim();
    if (!term) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    // 仅在输入框聚焦时展示下拉，避免首屏遮挡其它 UI
    if (!searchFocused) {
      setSuggestionsOpen(false);
      return;
    }

    // 如果用户只是在当前已选定的完整代码上“聚焦”，不弹下拉
    // 只有在用户修改了输入（例如输入部分码/换成别的码）时才展示候选。
    if (term === currentSym && term.length === 6) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch(`/api/stocks?q=${encodeURIComponent(term)}&period=${period}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setSuggestionsOpen(true);
        setActiveSuggestionIndex(0);
      } catch {
        setSuggestions([]);
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(0);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, period, searchFocused, currentSym]);

  useEffect(() => {
    if (!searchFocused) setSuggestionsOpen(false);
  }, [searchFocused]);

  return (
    <header className="px-12 bg-bg-deep/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center z-[100] sticky top-0 h-20">
      <div className="flex items-center">
        <a href="/" className="brand text-2xl font-brand tracking-tight flex items-center hover:opacity-80 transition-all">
          <span className="font-black text-white">Young</span>
          <span className="font-medium text-secondary mx-1 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">Quant</span>
          <span className="font-light text-white/60">Pro</span>
        </a>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Symbol Input Group - Refined for breathability */}
        <div className="flex items-center gap-3 h-10 group">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                setSearchFocused(false);
                setSuggestionsOpen(false);
              }}
              onKeyDown={(e) => {
                if (!suggestionsOpen) {
                  if (e.key === 'Enter') {
                    const sym =
                      suggestions?.find(s => s.symbol === searchTerm)?.symbol ||
                      suggestions?.[0]?.symbol ||
                      searchTerm;
                    setSuggestionsOpen(false);
                    onSelectStock(sym);
                  }
                  return;
                }

                if (e.key === 'Escape') {
                  setSuggestionsOpen(false);
                  return;
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSuggestionIndex(i => Math.min(i + 1, Math.max(0, (suggestions?.length || 1) - 1)));
                  return;
                }

                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSuggestionIndex(i => Math.max(i - 1, 0));
                  return;
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  const pick = suggestions?.[activeSuggestionIndex] || suggestions?.[0];
                  const sym = pick?.symbol || searchTerm;
                  setSuggestionsOpen(false);
                  setSearchTerm(sym);
                  onSelectStock(sym);
                }
              }}
              className="w-32 h-10 bg-black/40 border border-white/5 rounded-2xl px-5 text-sm font-bold text-white outline-none focus:border-secondary/30 focus:bg-black/60 transition-all text-center placeholder:text-white/10"
              placeholder="601899"
            />

            {suggestionsOpen && (
              <div className="absolute left-0 right-0 top-[44px] bg-bg-deep/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[100]">
                <div className="px-4 py-2 text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">
                  可选标的
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {suggestionsLoading ? (
                    <div className="px-4 py-3 text-white/30 text-xs font-bold">加载中...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-white/30 text-xs font-bold">无匹配结果</div>
                  ) : (
                    suggestions.slice(0, 8).map(s => {
                      const okFeatures = s.has_features;
                      const okModel = s.has_model;
                      const badge =
                        okFeatures && okModel ? '可预测' :
                        okFeatures && !okModel ? '缺模型' :
                        '待生成特征';
                      const badgeClass =
                        okFeatures && okModel ? 'text-up bg-up/10 border-up/20' :
                        okFeatures && !okModel ? 'text-secondary bg-secondary/10 border-secondary/20' :
                        'text-white/40 bg-white/5 border-white/10';

                      return (
                        <button
                          key={s.symbol}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSuggestionsOpen(false);
                            setSearchTerm(s.symbol);
                            onSelectStock(s.symbol);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white">{s.symbol}</span>
                            <span className="text-xs text-text-dim font-bold">{s.name}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${badgeClass}`}>
                            {badge}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              const sym =
                suggestions?.find(s => s.symbol === searchTerm)?.symbol ||
                suggestions?.[0]?.symbol ||
                searchTerm;
              setSuggestionsOpen(false);
              setSearchTerm(sym);
              onSelectStock(sym);
            }}
            className="btn-pro btn-pro-teal h-10 px-6"
          >
            切换
          </button>
        </div>

        <button
          onClick={onRefreshPipeline}
          disabled={refreshing}
          className={`btn-pro btn-pro-glass h-10 px-8 text-white/80 group ${refreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <RefreshCw
            size={14}
            className={`text-white/30 group-hover:text-secondary transition-all duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
          />
          {refreshing ? '训练中...' : '重训流水线'}
        </button>

        <button
          onClick={onOpenTutorial}
          className="btn-pro btn-pro-glass h-10 px-8 text-white/80 group"
        >
          <Settings size={14} className="text-white/30 group-hover:text-secondary transition-all" />
          教程
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-2"></div>

        {user ? (
          <div className="relative group">
            <button className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:border-white/10 transition-all shadow-inner">
                <UserCircle2 size={24} className="text-white/20" />
              </div>
            </button>
            <div className="absolute top-full right-0 mt-3 w-52 bg-bg-deep/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 hidden group-hover:block animate-fade-in shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50">
               <div className="p-4 border-b border-white/5">
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mb-1">Authenticated user</p>
                 <p className="text-sm font-black text-white">{user.name}</p>
               </div>
               <button onClick={onLogout} className="w-full text-left p-4 text-xs font-black text-up hover:bg-up/10 rounded-xl transition-all flex items-center gap-3 mt-1">
                 <LogOut size={14} /> 退出系统
               </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="btn-pro btn-pro-glass h-10 px-8 border-transparent text-white/40 hover:text-white"
          >
            登录
          </button>
        )}
      </div>
    </header>
  );
};

const Dashboard = ({
  currentSym,
  portfolio,
  period,
  logs,
  onAddLog,
  refreshPortfolio,
  onPeriodChange,
  signalInfo,
  signalLoading,
  signalError,
  availability,
  availabilityLoading
}) => {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/indicators?symbol=${currentSym}&period=${period}`);
        const data = await res.json();
        if (data && data.length) setPrice(data[data.length-1].close);
      } catch {
        console.error("Price fetch failed");
      }
    };
    if (currentSym) fetchPrice();
  }, [currentSym, period]);

  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiReport, setAiReport] = useState(null);

  useEffect(() => {
    if (!showDeepAnalysis) return;
    if (availabilityLoading) return;
    if (availability && !availability.has_features) {
      setAiLoading(false);
      setAiError('当前周期尚未生成特征文件，请先点击「重训流水线」。');
      setAiReport(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setAiLoading(true);
      setAiError('');
      setAiReport(null);
      try {
        const res = await fetch(`/api/ai-advisor?symbol=${currentSym}&period=${period}`);
        const data = await res.json();
        if (!cancelled) setAiReport(data);
      } catch (e) {
        if (!cancelled) setAiError(e?.message || '未知错误');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [showDeepAnalysis, currentSym, period, availability, availabilityLoading]);

  return (
    <div className="p-8 min-h-[calc(100vh-80px)] flex flex-col gap-8 animate-fade-in bg-bg-deep font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Main Zone - 7/12 for K-Line and Data */}
        <div className="lg:col-span-7 flex flex-col gap-8 min-h-0">
          <div className="section-card flex-[2] min-h-0">
             <div className="section-header">
                <div className="section-title-wrap">
                  <div className="ai-tag">CORE</div>
                  <h3 className="section-title-text pt-1">核心交易终端 TERMINAL</h3>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2 mr-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-up animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"></span>
                    <span className="text-[10px] font-black text-up uppercase tracking-widest">LIVE DATA FEED</span>
                  </div>
                  <div className="flex gap-3">
                    {['15m', '60m', '1D'].map((p) => (
                      <button 
                        key={p} 
                        onClick={() => onPeriodChange(p === '1D' ? 'daily' : p.replace('m', ''))}
                        className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          (p === '1D' ? 'daily' : p.replace('m', '')) === period
                            ? 'bg-white text-black shadow-lg shadow-white/10'
                            : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
             <div className="flex-1 bg-black/40 rounded-[2.5rem] border-2 border-white/5 overflow-hidden relative shadow-2xl">
               <TradingChart symbol={currentSym} period={period} />
             </div>
          </div>

          <div className="section-card flex-1 min-h-0">
             <div className="section-header">
                <div className="section-title-wrap">
                  <div className="ai-tag">DATA</div>
                  <h3 className="section-title-text pt-1">资产明细与日志 ASSETS</h3>
                </div>
                <button className="section-action-btn" onClick={() => setShowDeepAnalysis(true)}>导出完整报告 EXPORT</button>
             </div>
             <DataTabs portfolio={portfolio} logs={logs} />
          </div>
        </div>

        {/* Info Zone - 5/12 for Assets and AI */}
        <div className="lg:col-span-5 flex flex-col gap-8 min-h-0">
          <div className="section-card flex-[1.2] min-h-0">
             <div className="section-header">
                <div className="section-title-wrap">
                   <div className="ai-tag">PORTFOLIO</div>
                   <h3 className="section-title-text pt-1">资产净值 VAL</h3>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border-2 border-white/5 text-text-dim shadow-inner">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622l-.618-3.016z" /></svg>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-6">
               <div className="flex flex-col gap-4">
                 <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.4em] italic">TOTAL EQUITY VALUE</p>
                  <div className="flex items-baseline gap-4 line-clamp-1">
                    <p className="text-3xl font-black font-brand tracking-tighter text-white" style={{ color: '#ffffff' }}>¥{(portfolio.total_assets || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                   <span className={`text-2xl font-black px-3 py-1 rounded-xl bg-white/5 shadow-xl border border-white/5 ${portfolio.total_pnl_pct >= 0 ? 'text-up shadow-up/5' : 'text-down shadow-down/5'}`}>
                     {portfolio.total_pnl_pct >= 0 ? '▲' : '▼'}{Math.abs(portfolio.total_pnl_pct || 0).toFixed(2)}%
                   </span>
                 </div>
               </div>
               <div className="flex flex-col gap-2 pt-6 border-t border-white/5">
                 <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.4em] italic">AVAILABLE TRADING CASH</p>
                 <p className="text-4xl font-black font-brand tracking-tighter text-white/90" style={{ color: 'rgba(255,255,255,0.9)' }}>¥{(portfolio.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
               </div>
             </div>
          </div>

          <div className="section-card flex-[1.8] min-h-0">
             <div className="section-header">
                <div className="section-title-wrap">
                   <div className="ai-tag ai-special">AI</div>
                   <h3 className="section-title-text pt-1">YOUNGQUANT-V1</h3>
                </div>
                <button className="section-action-btn" onClick={() => setShowDeepAnalysis(true)}>深度研报 REPORT</button>
             </div>
             <ChatTerminal symbol={currentSym} price={price} period={period} stockName={stocks[currentSym]} />
          </div>

          <div className="section-card flex-[1.5] min-h-0">
             <div className="section-header">
                <div className="section-title-wrap">
                   <div className="ai-tag">EXEC</div>
                   <h3 className="section-title-text pt-1">快速交易控制 TRADE</h3>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">SIGNAL:</span>
                  {signalLoading ? (
                    <span className="text-sm text-white/40 font-black italic">加载中...</span>
                  ) : signalError ? (
                    <span className="text-sm text-text-dim font-black italic">{signalError}</span>
                  ) : (
                    <span
                      className={`text-sm font-black italic underline underline-offset-8 decoration-2 ${
                        signalInfo?.signal === 'BUY' ? 'text-up' : signalInfo?.signal === 'SELL' ? 'text-down' : 'text-secondary'
                      }`}
                    >
                      {signalInfo?.signal === 'BUY' ? 'BUY NOW' : signalInfo?.signal === 'SELL' ? 'SELL / HOLD' : 'HOLD'}
                    </span>
                  )}
                </div>
             </div>
             <TradePanel 
                symbol={currentSym} 
                price={price} 
                cash={portfolio.cash} 
                stockName={stocks[currentSym]} 
                suggestedSignal={signalInfo?.signal}
                availability={availability}
                availabilityLoading={availabilityLoading}
                onTradeSuccess={(msg) => { onAddLog(msg); refreshPortfolio(); }}
             />
          </div>
        </div>
      </div>

      {/* Deep Analysis Modal Placeholder */}
      {showDeepAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" onClick={() => setShowDeepAnalysis(false)}></div>
          <div className="section-card w-full max-w-xl relative z-10 p-16 text-center">
            <div className="ai-tag mb-8 mx-auto w-fit bg-[#00f2ea] text-black">DEEP ANALYSIS</div>
            <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">智能归因深度研报</h2>
            {aiLoading && (
              <p className="text-text-dim text-lg mb-12 font-medium">
                正在生成「{stocks[currentSym]}」的深度量化分析报告... 请稍后查看。
              </p>
            )}

            {!aiLoading && aiError && (
              <p className="text-down text-lg mb-12 font-medium">
                AI 分析失败：{aiError}
              </p>
            )}

            {!aiLoading && aiReport && (
              <div className="flex flex-col gap-4 text-left">
                {(() => {
                  const signal = aiReport.signal || 'HOLD';
                  const confPct = Math.round((aiReport.confidence || 0) * 100);
                  const chipClass =
                    signal === 'BUY' ? 'text-up border-up/40 bg-up/10' :
                    signal === 'SELL' ? 'text-down border-down/40 bg-down/10' :
                    'text-secondary border-white/10 bg-white/5';
                  const headline =
                    signal === 'BUY' ? 'AI 建议：关注买入机会' :
                    signal === 'SELL' ? 'AI 建议：关注卖出/回避风险' :
                    'AI 建议：保持观望（HOLD）';

                  return (
                    <>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${chipClass}`}>
                          {signal}
                        </span>
                        <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-text-main text-xs font-black uppercase tracking-widest">
                          {confPct}% 置信度
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white">{headline}</h3>
                      <div className="text-text-dim text-sm leading-relaxed">
                        <div className="mt-2">
                          <b className="text-text-main">原因：</b>{aiReport.reason}
                        </div>
                        <div className="mt-2">
                          <b className="text-text-main">主要风险：</b>{aiReport.risk}
                        </div>
                        <div className="mt-2">
                          <b className="text-text-main">专家建议：</b>{aiReport.expert_tip}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <button 
              onClick={() => setShowDeepAnalysis(false)}
              className="section-action-btn w-full py-6 text-xl"
            >
              确 认
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DeepAnalysis = ({ currentSym, period, availability, availabilityLoading }) => {
  const [activeTab, setActiveTab] = useState('sentiment');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (availabilityLoading) return;
    if (availability && !availability.has_features) {
      setLoading(false);
      setErr('当前周期尚未生成特征文件，请先点击「重训流水线」。');
      setReport(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErr('');
      setReport(null);
      try {
        const res = await fetch(`/api/ai-advisor?symbol=${currentSym}&period=${period}`);
        const data = await res.json();
        if (!cancelled) {
          if (data?.error) {
            setErr(data.error);
          } else {
            setReport(data);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || '未知错误');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentSym, period, availability, availabilityLoading]);

  const signal = report?.signal || 'HOLD';
  const conf = typeof report?.confidence === 'number' ? report.confidence : 0.82;
  const confPct = Math.round(conf * 100);
  const textBySignal =
    signal === 'BUY' ? 'text-up' :
    signal === 'SELL' ? 'text-down' :
    'text-secondary';
  const factorWidths = [
    confPct,
    Math.min(100, confPct + 9),
    Math.max(0, confPct - 17),
    Math.min(100, confPct + 3)
  ];
  
  return (
    <div className="p-10 h-[calc(100vh-80px)] flex flex-col gap-10 animate-fade-in overflow-y-auto">
      <div className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h2 className="text-4xl font-black font-brand tracking-tighter text-white">投研分析中心</h2>
          <p className="text-text-muted text-base flex items-center gap-3 mt-2">
            <span className="text-secondary font-black capitalize">{stocks[currentSym] || '加载中...'} ({currentSym})</span>
            <span className="text-text-dim font-bold">• AI 深度增强报告</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button className="glass px-6 py-3 rounded-xl text-sm font-black text-white hover:border-secondary/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">导出研报 PDF</button>
          <button className="glass px-6 py-3 rounded-xl text-sm font-black text-text-dim hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300">同步全维数据</button>
        </div>
      </div>

      <div className="flex gap-10 border-b border-white/5">
        {[
          { id: 'sentiment', label: '市场情绪', icon: <TrendingUp size={18}/> },
          { id: 'technical', label: '技术指标评分', icon: <Activity size={18}/> },
          { id: 'predictor', label: 'AI 预测空间', icon: <PieChart size={18}/> }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-3 pb-5 text-base font-black transition-all ${activeTab === t.id ? 'text-secondary border-b-2 border-secondary' : 'text-text-dim hover:text-white'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {loading && (
          <div className="py-20 text-center text-white/20 font-black italic tracking-widest">
            正在生成 AI 深度研报...
          </div>
        )}

        {!loading && err && (
          <div className="py-20 text-center text-down/80 font-black italic tracking-widest">
            {err}
          </div>
        )}

        {!loading && activeTab === 'sentiment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
             <div className="card p-8 flex flex-col items-center justify-center gap-6 shadow-xl">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5"/>
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={552}
                      strokeDashoffset={552 * (1 - conf)}
                      className={`${textBySignal} transition-all duration-1000 ease-out`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-black font-brand ${textBySignal}`}>{confPct}</span>
                    <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest mt-1 italic">PRO OPTIMISM</span>
                  </div>
                </div>
                <div className="text-center">
                   <h4 className={`text-xl font-black ${textBySignal}`}>
                    {signal === 'BUY' ? '市场偏强：关注买入机会' : signal === 'SELL' ? '市场偏弱：回避/减仓风险' : '市场观望：等待更清晰信号'}
                   </h4>
                   <p className="text-sm text-text-muted mt-2 max-w-sm font-medium">
                    {report?.reason || '数据加载中...'}
                   </p>
                </div>
             </div>
             <div className="flex flex-col gap-6">
                <div className="card p-6 flex flex-col gap-4 shadow-xl">
                   <h5 className="text-[0.6rem] font-black uppercase text-text-dim border-b border-white/5 pb-2 tracking-widest">核心决策情绪因子表</h5>
                   <div className="space-y-4">
                      {['主力大单买入', '分析师买入评级', '散户心理共鸣', '融资杠杆活跃度'].map((label, i) => {
                        const width = factorWidths[i];
                        return (
                          <div key={i} className="flex justify-between items-center">
                             <span className="text-sm font-bold text-text-main">{label}</span>
                             <div className="flex items-center gap-3">
                               <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-secondary" style={{width: `${width}%`}}></div>
                               </div>
                               <span className="text-[0.7rem] font-black text-secondary">{width}%</span>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="glass rounded-2xl p-6 flex items-center justify-between border-secondary/20 bg-secondary/5">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-secondary/10 rounded-xl">
                        <Sparkles className="text-secondary" size={20}/>
                      </div>
                      <div>
                         <h5 className="text-sm font-black text-text-main">AI 增强深度洞察</h5>
                         <p className="text-xs text-text-dim">置信度：{confPct}%（{signal}）</p>
                      </div>
                   </div>
                   <button className="bg-secondary text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-secondary/20 hover:brightness-110 active:scale-95 transition-all">查阅预测矩阵</button>
                </div>
             </div>
          </div>
        )}

        {!loading && activeTab === 'technical' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div className="card p-8 shadow-xl">
              <h4 className={`text-xl font-black ${textBySignal}`}>技术指标评分解读</h4>
              <p className="text-sm text-text-dim mt-4 leading-relaxed">
                <b className="text-text-main">原因：</b>
                {report?.reason || '数据加载中...'}
              </p>
              <p className="text-sm text-down/90 mt-3 leading-relaxed">
                <b className="text-text-main">主要风险：</b>
                {report?.risk || '—'}
              </p>
            </div>
            <div className="glass rounded-2xl p-8 border-secondary/20 bg-secondary/5 flex flex-col gap-4">
              <h5 className="text-sm font-black text-text-main">量化策略提示</h5>
              <p className="text-sm text-text-dim leading-relaxed">
                {report?.expert_tip || '—'}
              </p>
              <div className="h-[1px] bg-white/5" />
              <p className="text-xs text-text-dim">
                当前信号：<b className="text-text-main">{signal}</b>，置信度 <b className="text-text-main">{confPct}%</b>
              </p>
            </div>
          </div>
        )}

        {!loading && activeTab === 'predictor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div className="card p-8 shadow-xl">
              <h4 className={`text-xl font-black ${textBySignal}`}>AI 预测空间</h4>
              <div className="mt-6 flex items-baseline gap-4">
                <span className={`text-5xl font-black font-brand ${textBySignal}`}>{confPct}</span>
                <span className="text-text-dim font-black">%</span>
                <span className="text-text-muted text-sm font-black">上涨/空间置信度</span>
              </div>
              <p className="text-sm text-text-dim mt-4 leading-relaxed">
                {report?.reason || '—'}
              </p>
            </div>
            <div className="glass rounded-2xl p-8 border-secondary/20 bg-secondary/5 flex flex-col gap-4">
              <h5 className="text-sm font-black text-text-main">专家建议</h5>
              <p className="text-sm text-text-dim leading-relaxed">{report?.expert_tip || '—'}</p>
              <div className="h-[1px] bg-white/5" />
              <p className="text-sm text-down/90 leading-relaxed">
                <b className="text-text-main">风险对冲：</b>
                {report?.risk || '—'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [currentSym, setCurrentSym] = useState('601899');
  const [portfolio, setPortfolio] = useState({ holdings: {}, history: [], cash: 0, total_assets: 0 });
  const [period, setPeriod] = useState('15');
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signalInfo, setSignalInfo] = useState({ signal: 'HOLD', confidence: 0, date: '' });
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [_availabilityError, setAvailabilityError] = useState('');

  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  
  // Modals state
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio?period=${period}&_=` + Date.now());
      const data = await res.json();
      if (data) setPortfolio(data);
    } catch { /* silent fail */ }
  }, [period]);

  const fetchSignal = useCallback(async () => {
    setSignalLoading(true);
    setSignalError('');
    try {
      const res = await fetch(`/api/signal?symbol=${currentSym}&period=${period}&_=` + Date.now());
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setSignalInfo({
        signal: data?.signal || 'HOLD',
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
        date: data?.date || ''
      });
    } catch (e) {
      setSignalInfo({ signal: 'HOLD', confidence: 0, date: '' });
      setSignalError(e?.message || '未知错误');
    } finally {
      setSignalLoading(false);
    }
  }, [currentSym, period]);

  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    setAvailabilityError('');
    try {
      const res = await fetch(`/api/availability?symbol=${currentSym}&period=${period}&_=` + Date.now());
      const data = await res.json();
      if (!data) throw new Error('无可用数据');
      setAvailability(data);
    } catch (e) {
      setAvailability(null);
      setAvailabilityError(e?.message || '未知错误');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [currentSym, period]);

  useEffect(() => {
    // Wrap to avoid ESLint warning on direct call
    const init = async () => await fetchPortfolio();
    init();
    const timer = setInterval(fetchPortfolio, 10000);
    return () => clearInterval(timer);
  }, [fetchPortfolio]);

  useEffect(() => {
    // Signal depends on both symbol and period.
    fetchSignal();
  }, [fetchSignal]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const addLog = useCallback((msg) => setLogs(prev => [msg, ...prev].slice(0, 50)), []);

  const onRefreshPipeline = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      const prettyPeriod = period === 'daily' ? '1D' : `${period}m`;
      addLog(`[系统] 开始重训流水线：${currentSym} / ${prettyPeriod}`);

      const res = await fetch(`/api/refresh?symbol=${currentSym}&period=${period}`);
      const data = await res.json();

      if (data?.status === 'cooldown') {
        addLog(`[系统] ${data.msg}`);
        return;
      }

      if (data?.steps?.length) {
        data.steps.forEach(s => addLog(`[刷新] ${s}`));
      }

      if (data?.duration) {
        addLog(`[系统] 重训结束，耗时 ${data.duration}`);
      }
    } catch {
      addLog('[系统] 重训失败，请稍后再试。');
    } finally {
      setRefreshing(false);
      await fetchPortfolio();
      await fetchSignal();
      await fetchAvailability();
    }
  }, [refreshing, period, currentSym, addLog, fetchPortfolio, fetchSignal, fetchAvailability]);

  const isModalOpen = showAuth || showTutorial;

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${isModalOpen ? 'grayscale-[0.4] blur-[8px] pointer-events-none' : ''}`}>
      <Header 
        currentSym={currentSym} 
        period={period}
        refreshing={refreshing}
        onRefreshPipeline={onRefreshPipeline}
        onSelectStock={setCurrentSym} 
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onOpenTutorial={() => setShowTutorial(true)}
        onLogout={() => { setUser(null); addLog("用户已安全登出终端"); }}
      />
      <main className="flex-1 relative">
        {pathname === '/analysis' ? (
          <DeepAnalysis
            currentSym={currentSym}
            period={period}
            availability={availability}
            availabilityLoading={availabilityLoading}
          />
        ) : (
          <Dashboard 
            currentSym={currentSym} 
            portfolio={portfolio} 
            period={period} 
            signalInfo={signalInfo}
            signalLoading={signalLoading}
            signalError={signalError}
            availability={availability}
            availabilityLoading={availabilityLoading}
            logs={logs}
            onAddLog={addLog}
            refreshPortfolio={fetchPortfolio}
            onPeriodChange={setPeriod}
          />
        )}
      </main>

      {/* Modals are outside the blurred container */}
      <div className="pointer-events-auto">
        <AuthModal 
          isOpen={showAuth} 
          onClose={() => setShowAuth(false)} 
          onAuthSuccess={(u) => { setUser(u); addLog(`[系统] 欢迎回归, ${u.name}`); }}
        />
        <TutorialModal 
          isOpen={showTutorial} 
          onClose={() => setShowTutorial(false)} 
        />
      </div>
    </div>
  );
}

export default App;
