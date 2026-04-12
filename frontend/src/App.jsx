import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, BarChart3, MessageSquare, TrendingUp, Activity, 
  PieChart, Menu, Search, RefreshCw, ChevronDown, CheckCircle2,
  LogOut, Settings, UserCircle2, Sparkles, ShieldCheck
} from 'lucide-react';

// UI Components
import { Button } from './components/ui/button';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';

// Functional Components
import TradingChart from './components/TradingChart';
import ChatTerminal from './components/ChatTerminal';
import TradePanel from './components/TradePanel';
import DataTabs from './components/DataTabs';
import AuthModal from './components/AuthModal';
import TutorialModal from './components/TutorialModal';
import TutorialTour from './components/TutorialTour';
import EvidenceDocs from './pages/EvidenceDocs';
import HelpTooltip from './components/HelpTooltip';
import { StockCombobox } from './components/ui/combobox';
import StockScreener from './components/StockScreener';
import ReviewReport from './components/ReviewReport';
import LearningCenter from './pages/LearningCenter';
import PersonalCenter from './pages/PersonalCenter';
import Leaderboard from './pages/Leaderboard';
import MarketPage from './pages/MarketPage';
import OnboardingFlow from './components/OnboardingFlow';
import StrategyPage from './pages/StrategyPage';
import LandingPage from './pages/LandingPage';
import { ToastProvider, useToast } from './components/Toast';
import DraggableCard from './components/DraggableCard';
import MobileNav from './components/MobileNav';
import ErrorBoundary from './components/ErrorBoundary';
import NewUserChecklist from './components/NewUserChecklist';

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
  onOpenRefreshInfo,
  onSelectStock,
  user,
  onOpenAuth,
  onOpenTutorial,
  onLogout,
  portfolio,
  onNavigate,
  currentPage,
}) => {
  const [searchTerm, setSearchTerm] = useState(currentSym);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const popularStocks = React.useMemo(() => [
    { symbol: '601899', name: '紫金矿业', isPopular: true },
    { symbol: '600519', name: '贵州茅台', isPopular: true },
    { symbol: '000001', name: '平安银行', isPopular: true },
    { symbol: '300750', name: '宁德时代', isPopular: true },
    { symbol: '601318', name: '中国平安', isPopular: true }
  ], []);

  useEffect(() => {
    setSearchTerm(currentSym);
  }, [currentSym]);

  useEffect(() => {
    const term = (searchTerm || '').trim();
    const timer = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch(`/api/stocks?q=${encodeURIComponent(term)}&period=${period}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, period, popularStocks, currentSym]);

  return (
    <header className="px-4 md:px-12 bg-bg-deep/80 backdrop-blur-xl border-b border-white/5 z-[100] sticky top-0">
      {/* 桌面端布局 */}
      <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-4 h-20">
        <div className="flex items-center min-w-[180px]">
          <a href="/" className="brand text-2xl font-brand tracking-tight flex items-center hover:opacity-80 transition-all">
            <span className="font-black text-white">Young</span>
            <span className="font-medium text-secondary mx-1 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">Quant</span>
            <span className="font-light text-white/40 uppercase text-[10px] tracking-[0.2em] ml-2 border border-white/10 px-2 py-0.5 rounded-md">AI 量化</span>
          </a>
        </div>
      
      <div className="flex items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full flex items-center gap-3">
          <StockCombobox
            value={searchTerm}
            onSearchChange={setSearchTerm}
            onSelect={(val) => {
              setSearchTerm(val);
              onSelectStock(val);
            }}
            suggestions={suggestions}
            loading={suggestionsLoading}
            placeholder="输入证券代码、拼音或简称..."
          />
          <button 
            onClick={() => onSelectStock(searchTerm || currentSym)}
            className="btn-pro btn-pro-glass h-11 px-6 border-none text-[10px] whitespace-nowrap rounded-2xl"
          >
            切换系统标的
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-end min-w-[320px]">
        <button
          onClick={() => !refreshing && onOpenRefreshInfo?.()}
          disabled={refreshing}
          className={`btn-pro btn-pro-glass h-10 px-8 text-white/80 group ${refreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <RefreshCw
            size={14}
            className={`text-white/30 group-hover:text-secondary transition-all duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
          />
          {refreshing ? '训练中...' : '更新 AI 信号'}
        </button>

        <button
          id="tutorial-trigger"
          onClick={onOpenTutorial}
          className="btn-pro btn-pro-glass h-10 px-8 text-white/80 group"
        >
          <Settings size={14} className="text-white/30 group-hover:text-secondary transition-all" />
          教程
        </button>

        {/* 导航下拉：更多页面 */}
        <div
          className="relative"
          onMouseEnter={() => setNavOpen(true)}
          onMouseLeave={() => setNavOpen(false)}
        >
          <button className={`btn-pro btn-pro-glass h-10 px-5 flex items-center gap-2 transition-all ${['learning','leaderboard','personal','market','strategy'].includes(currentPage) ? 'border-secondary/40 text-secondary' : 'text-white/80'}`}>
            <LayoutDashboard size={14} className="opacity-60" />
            {currentPage === 'learning' ? '学习中心' : currentPage === 'leaderboard' ? '排行榜' : currentPage === 'personal' ? '个人中心' : currentPage === 'market' ? '市场行情' : currentPage === 'strategy' ? '策略中心' : '更多'}
            <ChevronDown size={12} className={`opacity-40 transition-transform duration-200 ${navOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* 透明桥接区，消除按钮和菜单之间的间隙 */}
          {navOpen && <div className="absolute top-full left-0 right-0 h-3" />}
          {navOpen && (
            <div className="absolute top-[calc(100%+4px)] right-0 w-48 bg-[#0a0a0b]/98 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 z-50 shadow-2xl">
              {[
                { key: 'market', label: '市场行情' },
                { key: 'strategy', label: '策略中心' },
                { key: 'learning', label: '学习中心' },
                { key: 'leaderboard', label: '排行榜' },
                ...(user ? [{ key: 'personal', label: '个人中心' }] : []),
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => { onNavigate?.(item.key); setNavOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-black rounded-xl transition-all ${currentPage === item.key ? 'bg-secondary/20 text-secondary' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={() => { onNavigate?.('dashboard'); setNavOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-black rounded-xl transition-all ${currentPage === 'dashboard' ? 'bg-secondary/20 text-secondary' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  主仪表盘
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-2"></div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-3 p-1 rounded-2xl bg-white/5 border border-white/5 hover:border-secondary/30 transition-all shadow-inner group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-secondary transition-all group-hover:from-secondary/40">
                  <UserCircle2 size={24} />
                </div>
                <div className="flex flex-col items-start pr-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Member</span>
                  <span className="text-xs font-black text-white uppercase">{user.name}</span>
                </div>
                <ChevronDown size={14} className="text-white/20 mr-2 group-hover:text-secondary transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full right-0 mt-3 w-64 bg-[#0a0a0b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_32px_64px_rgba(0,0,0,0.8)] z-50 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="p-4 border-b border-white/5 relative z-10">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mb-1">Authenticated ID</p>
                    <p className="text-sm font-black text-white truncate">{user.email}</p>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2 relative z-10">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Portfolio</p>
                       <p className="text-xs font-black text-up">¥{(portfolio.total_assets || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Status</p>
                       <p className="text-xs font-black text-secondary uppercase">PRO AI</p>
                    </div>
                  </div>
                  <div className="mt-1 p-1">
                    <button onClick={onLogout} className="w-full text-left p-3 text-xs font-black text-down/80 hover:bg-down/10 hover:text-down rounded-xl transition-all flex items-center gap-3">
                       <LogOut size={14} /> 退出系统
                    </button>
                  </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button 
              onClick={onOpenAuth}
              variant="outline"
              className="h-10 px-8 border-secondary/30 bg-secondary/5 text-secondary font-black hover:bg-secondary/10 transition-all text-xs rounded-2xl"
            >
              注册登录
            </Button>
          </div>
        )}
      </div>
      </div>{/* 关闭桌面端 hidden md:grid */}

      {/* 移动端导航栏 */}
      <div className="md:hidden flex items-center justify-between h-16">
        <a href="/" className="brand text-xl font-brand tracking-tight flex items-center">
          <span className="font-black text-white">Young</span>
          <span className="font-medium text-secondary mx-1">Quant</span>
        </a>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 font-black">{user.name}</span>
              <button onClick={onLogout} className="text-[10px] text-white/30 hover:text-white px-2 py-1 bg-white/5 rounded-lg">退出</button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="text-xs font-black text-secondary bg-secondary/10 border border-secondary/20 px-3 py-1.5 rounded-xl">登录</button>
          )}
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="text-[10px] text-white/40 hover:text-white bg-white/5 px-2 py-1.5 rounded-lg"
          >
            主页
          </button>
        </div>
      </div>
    </header>
  );
};

// ── SSEListener：在 ToastProvider 内部订阅 SSE，可以使用 useToast ──
const SSEListener = ({ user, onOrderFilled, onAddLog }) => {
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('yq_token');
    if (!token) return;

    const es = new EventSource(`/api/stream?token=${token}`);

    es.addEventListener('order_filled', (e) => {
      try {
        const d = JSON.parse(e.data);
        const actionCN = d.action === '买入' ? '买入' : '卖出';
        const msg = `限价${actionCN}单成交：${d.name || d.symbol} ${d.qty}股 @¥${d.price}`;
        toast.success(msg, 6000);
        onAddLog(`[成交] ${msg}`);
        onOrderFilled();
      } catch {}
    });

    es.onerror = () => {}; // 浏览器自动重连

    return () => es.close();
  }, [user, toast, onOrderFilled, onAddLog]);

  return null;
};

// ── ChartCard：大K线卡片，含行情数据条 + K线图 + 指标条 ──
const ChartCard = ({ currentSym, period, onPeriodChange, portfolio, stocks }) => {
  const [lastBar, setLastBar] = useState(null);
  const [prevClose, setPrevClose] = useState(null);

  // 拿前一根K线的收盘价用于计算涨跌幅
  const handleDataUpdate = useCallback((bar, allData) => {
    setLastBar(bar);
    if (allData && allData.length >= 2) {
      setPrevClose(allData[allData.length - 2].close);
    }
  }, []);

  const price = lastBar ? parseFloat(lastBar.close) : 0;
  const open  = lastBar ? parseFloat(lastBar.open)  : 0;
  const high  = lastBar ? parseFloat(lastBar.high)  : 0;
  const low   = lastBar ? parseFloat(lastBar.low)   : 0;
  const vol   = lastBar ? parseFloat(lastBar.volume): 0;
  const ma5   = lastBar ? parseFloat(lastBar.ma5)   : null;
  const ma20  = lastBar ? parseFloat(lastBar.ma20)  : null;
  const rsi   = lastBar ? parseFloat(lastBar.rsi)   : null;
  const macd  = lastBar ? parseFloat(lastBar.macd)  : null;

  const changePct = (price > 0 && prevClose > 0)
    ? ((price - prevClose) / prevClose * 100) : null;
  const changeAmt = (price > 0 && prevClose > 0) ? (price - prevClose) : null;
  const isUp = changePct == null ? null : changePct >= 0;

  const fmtVol = (v) => {
    if (!v) return '--';
    if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(2) + '万';
    return v.toFixed(0);
  };

  const holding = portfolio?.holdings?.[currentSym];

  return (
    <div id="chart-zone" className="section-card flex-none relative group/card p-0 overflow-hidden">
      {/* ── 顶部：股票名称 + 价格 + 涨跌 ── */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* 左：名称 + 代码 + 价格 */}
          <div className="flex items-baseline gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-white/40 tracking-widest">{currentSym}</span>
                {stocks?.[currentSym] && (
                  <span className="text-sm font-black text-white">{stocks[currentSym]}</span>
                )}
                {holding && (
                  <span className="text-[10px] font-black text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-lg">
                    持仓 {holding.shares}股
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-black tabular-nums ${isUp === null ? 'text-white' : isUp ? 'text-up' : 'text-down'}`}>
                  {price > 0 ? price.toFixed(2) : '--'}
                </span>
                {changePct != null && (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black tabular-nums ${isUp ? 'text-up' : 'text-down'}`}>
                      {isUp ? '+' : ''}{changeAmt?.toFixed(2)}
                    </span>
                    <span className={`text-sm font-black tabular-nums px-2 py-0.5 rounded-lg ${isUp ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                      {isUp ? '+' : ''}{changePct.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右：OHLV 数据格 */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: '开', val: open > 0 ? open.toFixed(2) : '--', color: 'text-white/70' },
              { label: '高', val: high > 0 ? high.toFixed(2) : '--', color: 'text-up' },
              { label: '低', val: low  > 0 ? low.toFixed(2)  : '--', color: 'text-down' },
              { label: '量', val: fmtVol(vol), color: 'text-white/70' },
            ].map(item => (
              <div key={item.label} className="text-center min-w-[48px]">
                <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">{item.label}</p>
                <p className={`text-xs font-black tabular-nums ${item.color}`}>{item.val}</p>
              </div>
            ))}

            {/* 周期切换 */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/8 ml-2">
              {[
                { label: '日K', value: 'daily' },
                { label: '15分', value: '15' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => onPeriodChange(p.value)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    period === p.value
                      ? 'bg-secondary text-black shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                      : 'text-white/30 hover:text-white/70'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 实时标记 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-up/5 border border-up/20 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
              <span className="text-[9px] font-black text-up/70 uppercase tracking-widest">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── K线图主体 ── */}
      <div className="h-[520px] bg-black/20 relative">
        <TradingChart
          symbol={currentSym}
          period={period}
          zoom={60}
          onDataUpdate={handleDataUpdate}
        />
      </div>

      {/* ── 底部指标条 ── */}
      <div className="px-6 py-3 border-t border-white/5 flex items-center gap-6 flex-wrap">
        {[
          { label: 'MA5',  val: ma5  != null ? ma5.toFixed(2)  : '--', color: 'text-[#f59e0b]' },
          { label: 'MA20', val: ma20 != null ? ma20.toFixed(2) : '--', color: 'text-[#8b5cf6]' },
          { label: 'RSI',  val: rsi  != null ? rsi.toFixed(1)  : '--',
            color: rsi == null ? 'text-white/40' : rsi > 70 ? 'text-up' : rsi < 30 ? 'text-down' : 'text-white/60' },
          { label: 'MACD', val: macd != null ? (macd >= 0 ? '+' : '') + macd.toFixed(3) : '--',
            color: macd == null ? 'text-white/40' : macd >= 0 ? 'text-up' : 'text-down' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[9px] text-white/25 uppercase tracking-widest">{item.label}</span>
            <span className={`text-xs font-black tabular-nums ${item.color}`}>{item.val}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[9px] text-white/20">
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#f59e0b] inline-block" />MA5</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#8b5cf6] inline-block" />MA20</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-up/40 inline-block" />阳线</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-down/40 inline-block" />阴线</span>
        </div>
      </div>
    </div>
  );
};

const MarketOverview = ({ currentSym, period, price }) => {
  const [stats, setStats] = useState({ high52: null, low52: null, volume: null, turnover: null, change_pct: null });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/indicators?symbol=${currentSym}&period=${period}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;
        const closes = data.map(d => d.close).filter(Boolean);
        const volumes = data.map(d => d.volume).filter(Boolean);
        const high52 = Math.max(...closes);
        const low52 = Math.min(...closes);
        const latestVol = volumes[volumes.length - 1] || 0;
        const latest = data[data.length - 1];
        const prev = data[data.length - 2];
        const change_pct = prev && prev.close ? ((latest.close - prev.close) / prev.close) * 100 : null;
        const turnover = latest.turnover_rate || null;
        setStats({ high52, low52, volume: latestVol, turnover, change_pct });
      } catch {}
    };
    if (currentSym) fetchStats();
  }, [currentSym, period]);

  return (
    <div className="section-card flex-none relative group/card">
      <div className="section-header pb-2 mb-3 border-b border-white/5">
        <div className="section-title-wrap">
          <div className="ai-tag">MARKET</div>
          <h3 className="section-title-text pt-1">市场概览</h3>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">最新价</p>
          <p className="text-sm font-black text-white">¥{price.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">涨跌幅</p>
          <p className={`text-sm font-black ${stats.change_pct == null ? 'text-white/40' : stats.change_pct >= 0 ? 'text-up' : 'text-down'}`}>
            {stats.change_pct != null ? `${stats.change_pct >= 0 ? '+' : ''}${stats.change_pct.toFixed(2)}%` : '--'}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">成交量</p>
          <p className="text-sm font-black text-white">
            {stats.volume ? (stats.volume >= 1e8 ? `${(stats.volume / 1e8).toFixed(2)}亿` : stats.volume >= 1e4 ? `${(stats.volume / 1e4).toFixed(2)}万` : stats.volume.toFixed(0)) : '--'}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">52周最高</p>
          <p className="text-sm font-black text-up">¥{stats.high52?.toFixed(2) ?? '--'}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">52周最低</p>
          <p className="text-sm font-black text-down">¥{stats.low52?.toFixed(2) ?? '--'}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">换手率</p>
          <p className="text-sm font-black text-white/60">{stats.turnover != null ? `${stats.turnover.toFixed(2)}%` : '--'}</p>
        </div>
      </div>
    </div>
  );
};

// 自选股快速访问（内联小组件）
const WatchlistQuick = ({ token, onSelectStock }) => {
  const [list, setList] = React.useState([]);
  React.useEffect(() => {
    if (!token) return;
    fetch('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setList(Array.isArray(d) ? d.slice(0, 6) : [])).catch(() => {});
  }, [token]);
  if (list.length === 0) return <p className="text-xs text-white/30 text-center py-3">暂无自选股，去添加吧</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(item => (
        <button key={item.symbol} onClick={() => onSelectStock?.(item.symbol)}
          className="px-3 py-1.5 bg-white/5 border border-white/8 rounded-xl text-xs font-black text-white/70 hover:bg-secondary/10 hover:border-secondary/30 hover:text-secondary transition-all">
          {item.symbol}
        </button>
      ))}
    </div>
  );
};

// 每日课堂迷你版（内联小组件）
const DailyLessonMini = ({ token }) => {
  const [lesson, setLesson] = React.useState(null);
  const [read, setRead] = React.useState(false);
  React.useEffect(() => {
    fetch('/api/learning/daily-lesson').then(r => r.json()).then(d => setLesson(d.lesson)).catch(() => {});
  }, []);
  if (!lesson) return <p className="text-xs text-white/30 text-center py-3">加载中...</p>;
  const COLORS = { '技术分析': 'text-teal-400', '基本面分析': 'text-blue-400', '交易心理': 'text-purple-400', '风险管理': 'text-yellow-400' };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[9px] font-black uppercase ${COLORS[lesson.category] || 'text-white/40'}`}>{lesson.category}</span>
      </div>
      <p className="text-sm font-black text-white leading-snug">{lesson.title}</p>
      <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3">{lesson.content}</p>
      {token && !read && (
        <button onClick={() => {
          fetch('/api/learning/daily-lesson/read', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lesson_id: lesson.id }) });
          setRead(true);
        }} className="text-[9px] text-secondary hover:underline self-end mt-1">标记已读</button>
      )}
      {read && <span className="text-[9px] text-green-400 self-end">已读</span>}
    </div>
  );
};

// 今日交易统计（独立组件，避免 IIFE 在 JSX Fragment 内的解析问题）
const TodayStats = ({ portfolio }) => {
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = (portfolio.history || []).filter(h => h.date?.startsWith(today));
  const buys = todayTrades.filter(h => h.action === 'buy').length;
  const sells = todayTrades.filter(h => h.action === 'sell').length;
  const todayPnl = todayTrades.filter(h => h.action === 'sell')
    .reduce((s, h) => s + ((h.price - (h.cost || h.price)) * h.shares - h.fee), 0);
  return (
    <div className="section-card relative group/card">
      <div className="section-header pb-2 mb-3 border-b border-white/5">
        <div className="section-title-wrap">
          <div className="ai-tag">TODAY</div>
          <h3 className="section-title-text pt-1">今日交易统计</h3>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
          <p className="text-[9px] text-white/30 uppercase mb-1">买入</p>
          <p className="text-lg font-black text-up">{buys}</p>
          <p className="text-[9px] text-white/20">笔</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
          <p className="text-[9px] text-white/30 uppercase mb-1">卖出</p>
          <p className="text-lg font-black text-down">{sells}</p>
          <p className="text-[9px] text-white/20">笔</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
          <p className="text-[9px] text-white/30 uppercase mb-1">今日盈亏</p>
          <p className={`text-lg font-black ${todayPnl >= 0 ? 'text-up' : 'text-down'}`}>
            {todayPnl >= 0 ? '+' : ''}{todayPnl.toFixed(0)}
          </p>
          <p className="text-[9px] text-white/20">元</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({
  currentSym,
  portfolio,
  portfolioLoading,
  period,
  logs,
  onAddLog,
  refreshPortfolio,
  onPeriodChange,
  signalInfo,
  user,
  onOpenAuth,
  availability,
  availabilityLoading,
  authGateEnabled,
  authGateVisible,
  onSelectStock,
  subPage,
  setSubPage,
  onNavigate,
  orderRefreshKey,
}) => {
  const [price, setPrice] = useState(0);
  const chartZoom = 60; // Standardized for professional look
  
  // Dashboard layout state (Step 7)
  const [activeCards, setActiveCards] = useState({
    chart: true,
    assets: true,
    ai: true,
    trade: true,
    macro: false,
    attribution: false,
    heatmap: false
  });
  const [showScreener, setShowScreener] = useState(false);
  const [sectors, setSectors] = useState([]);
  const [hotStocks, setHotStocks] = useState([]);

  const toggleCard = (id) => setActiveCards(prev => ({ ...prev, [id]: !prev[id] }));

  // 教程激活卡片事件监听
  useEffect(() => {
    const handler = (e) => {
      const { cardId } = e.detail || {};
      if (cardId) setActiveCards(prev => ({ ...prev, [cardId]: true }));
    };
    window.addEventListener('yq:activate-card', handler);
    return () => window.removeEventListener('yq:activate-card', handler);
  }, []);

  // 热门股票与板块数据，每 60 秒刷新
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [secRes, hotRes] = await Promise.all([
          fetch('/api/market/sectors'),
          fetch('/api/market/hot-stocks'),
        ]);
        if (secRes.ok) { const d = await secRes.json(); setSectors(d.sectors || []); }
        if (hotRes.ok) { const d = await hotRes.json(); setHotStocks(d.stocks || []); }
      } catch {}
    };
    fetchMarketData();
    const timer = setInterval(fetchMarketData, 60000);
    return () => clearInterval(timer);
  }, []);

  // 财经新闻
  const FALLBACK_NEWS = [
    { title: 'A股三大指数集体收涨，沪指涨0.8%，成交额突破万亿', source: '财联社' },
    { title: '央行：继续实施稳健的货币政策，保持流动性合理充裕', source: '新华社' },
    { title: '科技板块领涨，半导体、AI概念股表现活跃', source: '证券时报' },
  ];
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [expandedNews, setExpandedNews] = useState(null);
  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setNews(data.slice(0, 3));
        else setNews(FALLBACK_NEWS);
      })
      .catch(() => setNews(FALLBACK_NEWS));
  }, []);

  // 盈亏归因：基于持仓和板块数据动态计算
  const pnlAttribution = React.useMemo(() => {
    if (!portfolio?.holdings || Object.keys(portfolio.holdings).length === 0) return null;
    const holdings = portfolio.holdings;
    let totalValue = 0, weightedPnl = 0;
    for (const h of Object.values(holdings)) {
      const val = (h.price || 0) * (h.shares || 0);
      totalValue += val;
      weightedPnl += val * ((h.pnl_pct || 0) / 100);
    }
    if (totalValue === 0) return null;
    const avgPnlPct = (weightedPnl / totalValue) * 100;
    // 简化归因：市场β ≈ 大盘涨跌（用板块均值近似），个股异动 = 总收益 - 市场β
    const sectorAvg = sectors.length > 0 ? sectors.reduce((s, sec) => s + (sec.change_pct || 0), 0) / sectors.length : 0;
    const stockAlpha = avgPnlPct - sectorAvg;
    return [
      { label: '市场 β 贡献', val: `${sectorAvg >= 0 ? '+' : ''}${sectorAvg.toFixed(2)}%`, color: sectorAvg >= 0 ? 'text-up' : 'text-down' },
      { label: '持仓综合收益', val: `${avgPnlPct >= 0 ? '+' : ''}${avgPnlPct.toFixed(2)}%`, color: avgPnlPct >= 0 ? 'text-secondary' : 'text-down' },
      { label: '个股 Alpha', val: `${stockAlpha >= 0 ? '+' : ''}${stockAlpha.toFixed(2)}%`, color: stockAlpha >= 0 ? 'text-up' : 'text-down' },
    ];
  }, [portfolio, sectors]);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/indicators?symbol=${currentSym}&period=${period}`);
        if (!res.ok) throw new Error('Price fetch failed');
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
        if (!res.ok) throw new Error('AI Advisor failed');
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
    <div className="p-8 min-h-[calc(100vh-80px)] flex flex-col gap-6 animate-fade-in bg-bg-deep font-sans">
      {/* SubPage overlay */}
      {subPage && (
        <div className="animate-fade-in">
          <button onClick={() => setSubPage(null)} className="mb-4 flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">
            ← 返回主界面
          </button>
          {subPage === 'stock-guide' && (
            <div className="section-card p-8">
              <div className="ai-tag mb-4">GUIDE</div>
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">如何切换股票</h2>
              <div className="space-y-4 text-sm text-white/70 leading-relaxed">
                <p>1. 在顶部搜索框输入股票代码（如 600519）或公司名称（如 茅台）。</p>
                <p>2. 从下拉建议列表中选择目标股票，或直接点击"切换系统标的"按钮确认。</p>
                <p>3. 系统将自动加载该股票的 K 线图、AI 信号及相关数据。</p>
                <p>4. 支持的股票包括沪深两市主板、创业板、科创板上市公司。</p>
              </div>
            </div>
          )}
          {subPage === 'trade-guide' && (
            <div className="section-card p-8">
              <div className="ai-tag mb-4">TRADE</div>
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">交易教程</h2>
              <div className="space-y-6 text-sm text-white/70 leading-relaxed">
                <div>
                  <h3 className="text-white font-black mb-2">T+1 规则</h3>
                  <p>A 股实行 T+1 交割制度：当日买入的股票，次个交易日才能卖出。本平台模拟盘遵循此规则。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">涨跌停限制</h3>
                  <p>普通股票每日涨跌幅限制为 ±10%，科创板和创业板注册制股票为 ±20%，ST 股票为 ±5%。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">手续费说明</h3>
                  <p>买入：佣金约 0.03%（最低 5 元）；卖出：佣金 0.03% + 印花税 0.1%。本平台模拟盘按此标准扣费。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">如何下单</h3>
                  <p>1. 在右侧"交易台"卡片中选择买入或卖出。</p>
                  <p>2. 输入股数（最小单位 100 股/手）。</p>
                  <p>3. 确认价格后点击提交，系统以当前市价成交。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">常见问题</h3>
                  <p><b className="text-white">Q: 为什么买入失败？</b> 可能是可用现金不足，或输入股数不是 100 的整数倍。</p>
                  <p className="mt-2"><b className="text-white">Q: 卖出后资金何时到账？</b> 模拟盘中卖出后资金立即到账，真实交易为 T+1。</p>
                </div>
              </div>
            </div>
          )}
          {subPage === 'position' && (
            <div className="section-card p-8">
              <div className="ai-tag mb-4">POSITION</div>
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">持仓详情</h2>
              <DataTabs portfolio={portfolio} portfolioLoading={portfolioLoading} logs={logs} token={user ? localStorage.getItem('yq_token') : null} />
            </div>
          )}
          {subPage === 'ai-guide' && (
            <div className="section-card p-8">
              <div className="ai-tag ai-special mb-4">AI</div>
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">AI 功能介绍</h2>
              <div className="space-y-6 text-sm text-white/70 leading-relaxed">
                <div>
                  <h3 className="text-white font-black mb-2">AI 对话分析</h3>
                  <p>右侧 AI 对话框基于 YoungQuant-V1 模型，可回答股票行情、技术指标、投资策略等问题。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">AI 交易信号</h3>
                  <p>系统每日生成 BUY / SELL / HOLD 信号，置信度越高代表模型对该方向越确定。信号仅供参考，不构成投资建议。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">AI 选股</h3>
                  <p>点击顶部导航栏的"AI 选股"按钮，系统将根据量化因子筛选出当前市场中符合条件的股票。</p>
                </div>
                <div>
                  <h3 className="text-white font-black mb-2">AI 复盘</h3>
                  <p>在历史成交记录中，点击卖出记录旁的"AI 复盘"按钮，获取该笔交易的深度分析报告。</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!subPage && (<>
      {/* Dashboard Nav Bar (Step 7) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-3xl sticky top-24 z-[90] shadow-2xl">
        <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
          {[
            { id: 'chart', label: '行情', icon: <BarChart3 size={14}/> },
            { id: 'assets', label: '资产', icon: <PieChart size={14}/> },
            { id: 'ai', label: '实验室', icon: <Sparkles size={14}/> },
            { id: 'trade', label: '交易台', icon: <Activity size={14}/> },
            { id: 'macro', label: '宏情', icon: <TrendingUp size={14}/> },
            { id: 'attribution', label: '归因', icon: <LayoutDashboard size={14}/> },
            { id: 'heatmap', label: '热图', icon: <PieChart size={14}/> }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => toggleCard(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${activeCards[item.id] ? 'bg-secondary text-black shadow-lg shadow-secondary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 px-4">
          <button onClick={() => onNavigate?.('docs')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-white hover:border-secondary/30 transition-all">
             产品文档
          </button>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <button onClick={() => onNavigate?.('learning')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-white hover:border-secondary/30 transition-all">
             证券知识库
          </button>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <button
            onClick={() => setShowScreener(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-[10px] font-black text-secondary hover:bg-secondary/20 transition-all"
          >
            AI 选股
          </button>
          {price > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] font-black text-white/40">{stocks[currentSym] || currentSym}</span>
              <span className="text-[10px] font-black text-white">¥{price.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-8 min-h-0">
          {/* Quick Guide Cards — K线图上方 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                dot: 'bg-blue-400',
                title: '切换股票',
                desc: '顶部搜索框输入代码或名称',
                color: 'border-blue-500/20 bg-blue-500/5',
                tag: 'text-blue-400',
                action: 'stock-guide',
              },
              {
                dot: 'bg-teal-400',
                title: '买卖股票',
                desc: 'K线图下方"交易台"输入数量下单',
                color: 'border-teal-500/20 bg-teal-500/5',
                tag: 'text-teal-400',
                action: 'trade-guide',
              },
              {
                dot: 'bg-green-400',
                title: '查看仓位',
                desc: '下方"资产"标签页查看持仓盈亏',
                color: 'border-green-500/20 bg-green-500/5',
                tag: 'text-green-400',
                action: 'position',
              },
              {
                dot: 'bg-purple-400',
                title: 'AI 分析',
                desc: '右侧 AI 对话框获取行情解读',
                color: 'border-purple-500/20 bg-purple-500/5',
                tag: 'text-purple-400',
                action: 'ai-guide',
              },
            ].map((card, i) => (
              <div key={i} onClick={() => setSubPage(card.action)} className={`rounded-2xl border p-3 flex flex-col gap-1.5 cursor-pointer hover:opacity-80 transition-opacity z-0 ${card.color}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${card.dot}`}></span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${card.tag}`}>{card.title}</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* ── 大K线卡片 ── */}
          {activeCards.chart && (
            <ChartCard
              currentSym={currentSym}
              period={period}
              onPeriodChange={onPeriodChange}
              portfolio={portfolio}
              stocks={stocks}
            />
          )}

          {/* Trade Execution Panel — K线图下方，便于看图下单 */}
          {activeCards.trade && (
            <div id="trade-zone" className="section-card flex-none relative group/card" style={{ resize: 'vertical', overflow: 'auto', minHeight: '300px' }}>
               {!user && authGateEnabled && <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-xl z-50 rounded-[2.5rem]"></div>}
               <div className="section-header">
                  <div className="section-title-wrap">
                     <div className="ai-tag">EXEC</div>
                     <h3 className="section-title-text pt-1">快速交易控制</h3>
                     <HelpTooltip title="模拟交易" text="遵循A股真实规则：T+1（当日买入次日才能卖出）、涨跌停限制、万五手续费（最低5元）。" />
                  </div>
                  <Badge className={`${signalInfo.signal === 'BUY' ? 'bg-up/20 text-up' : signalInfo.signal === 'SELL' ? 'bg-down/20 text-down' : 'bg-white/10 text-white/40'} font-black text-[10px]`}>
                    {signalInfo.signal}
                  </Badge>
               </div>
               <TradePanel
                 symbol={currentSym}
                 price={price}
                 cash={portfolio?.cash || 0}
                 stockName={stocks[currentSym]}
                 suggestedSignal={signalInfo?.signal}
                 availability={availability}
                 availabilityLoading={availabilityLoading}
                 portfolio={portfolio}
                 orderRefreshKey={orderRefreshKey}
                 onTradeSuccess={(msg) => {
                   refreshPortfolio();
                   onAddLog(msg || `[系统] 交易已执行：${currentSym}`);
                 }}
               />
            </div>
          )}

          {/* Asset Tabs Section */}
          <div id="portfolio-zone" className="section-card flex-1 min-h-0 relative group/card">
            {!user && authGateEnabled && (
              <div className={`absolute inset-0 bg-bg-deep/60 backdrop-blur-xl z-[50] flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] border-2 border-white/5 shadow-2xl transition-all duration-700 ${authGateVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <h4 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase italic">Access Locked</h4>
                 <Button onClick={onOpenAuth} className="bg-white text-black px-8 py-3 text-[10px] font-black hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">登录后展示</Button>
              </div>
            )}
            <div className="section-header">
               <div className="section-title-wrap">
                 <div className="ai-tag">DATA</div>
                 <h3 className="section-title-text pt-1">资产明细与日志 ASSETS</h3>
                 <HelpTooltip title="资产与日志" text="查看当前持仓盈亏、历史成交记录以及系统运行日志。" />
               </div>
               <button className="section-action-btn" onClick={() => setShowDeepAnalysis(true)}>导出完整报告 EXPORT</button>
            </div>
            <DataTabs portfolio={portfolio} portfolioLoading={portfolioLoading} logs={logs} token={user ? localStorage.getItem('yq_token') : null} />
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Macro Insights Section */}
            {activeCards.macro && (
              <div className="section-card min-h-[180px] relative group/card flex flex-col">
                 <div className="section-header pb-2 mb-4 border-b border-white/5">
                   <div className="section-title-wrap">
                      <div className="ai-tag">MACRO</div>
                      <h3 className="section-title-text pt-1">财经快讯</h3>
                   </div>
                 </div>
                 <div className="flex flex-col gap-2 flex-1">
                   {news.map((item, i) => (
                     <div key={i} className="rounded-xl bg-white/5 border border-white/5 hover:border-secondary/20 transition-all cursor-pointer group/news overflow-hidden"
                       onClick={() => setExpandedNews(expandedNews === i ? null : i)}>
                       <div className="flex items-start gap-2 p-2.5">
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${i === 0 ? 'bg-up/20 text-up' : 'bg-white/5 text-white/30'}`}>
                           {i === 0 ? 'TOP' : `#${i+1}`}
                         </span>
                         <p className="text-[11px] font-black text-white/70 group-hover/news:text-white transition-colors leading-relaxed flex-1">{item.title}</p>
                         <span className="text-[9px] text-white/20 shrink-0 mt-0.5">{expandedNews === i ? '▲' : '▼'}</span>
                       </div>
                       {expandedNews === i && (
                         <div className="px-3 pb-3 border-t border-white/5 pt-2">
                           {item.content && <p className="text-[11px] text-white/50 leading-relaxed mb-2">{item.content}</p>}
                           {item.source && <p className="text-[9px] text-white/20">{item.source}</p>}
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* AI Attribution Section */}
            {activeCards.attribution && (
              <div className="section-card min-h-[180px] relative group/card flex flex-col">
                 <div className="section-header pb-2 mb-4 border-b border-white/5">
                   <div className="section-title-wrap">
                      <div className="ai-tag ai-special">ALPHA</div>
                      <h3 className="section-title-text pt-1">AI 盈亏归因 PNL-A</h3>
                     <HelpTooltip title="盈亏归因" text="将持仓收益拆解为市场β（大盘涨跌贡献）和个股Alpha（超额收益）两部分，帮助判断收益来源。" />
                   </div>
                 </div>
                 <div className="flex flex-col gap-2 flex-1 justify-center">
                    {pnlAttribution ? pnlAttribution.map((item, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                         <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.label}</span>
                         <span className={`text-[10px] font-black ${item.color}`}>{item.val}</span>
                      </div>
                    )) : (
                      <div className="text-center text-[10px] text-white/20 italic py-4">持仓后显示归因分析</div>
                    )}
                    <div className="text-[8px] font-bold text-white/20 text-center uppercase tracking-[0.2em] mt-2 italic">Based on real holdings</div>
                 </div>
              </div>
            )}

          {/* AI Sector Heatmap Section */}
          {activeCards.heatmap && (
            <div className="section-card min-h-[180px] relative group/card flex flex-col">
               <div className="section-header pb-2 mb-4 border-b border-white/5">
                 <div className="section-title-wrap">
                    <div className="ai-tag bg-secondary/10 text-secondary">SECTOR</div>
                    <h3 className="section-title-text pt-1">板块 Alpha 热图 ALPHA-MAP</h3>
                    <HelpTooltip title="板块热图" text="展示各板块的平均涨跌幅，颜色越深代表涨跌幅越大。点击板块可查看龙头股。" />
                    <HelpTooltip title="板块热图" text="展示当前 24 小时内表现最优异的 AI 聚合板块及其龙头表现。" />
                 </div>
               </div>
               <div className="flex-1 flex items-center justify-between gap-2">
                  {(sectors.length > 0 ? sectors : Array(3).fill({ name: '—', change_pct: 0, leader_name: '' })).map((item, i) => {
                    const pct = item.change_pct || 0;
                    const isUp = pct > 0;
                    return (
                      <div
                        key={i}
                        onClick={() => item.leader && onSelectStock?.(item.leader)}
                        className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-2xl border border-white/5 relative overflow-hidden ${item.leader ? 'cursor-pointer' : ''} group/item`}
                      >
                         <div className={`absolute inset-0 ${isUp ? 'bg-up/10' : pct < 0 ? 'bg-down/10' : 'bg-white/5'} group-hover/item:opacity-150 transition-opacity`}></div>
                         <span className="text-[10px] font-black tracking-widest relative z-10 mb-0.5 text-white/80">{item.name}</span>
                         <span className={`text-sm font-black relative z-10 ${isUp ? 'text-up' : pct < 0 ? 'text-down' : 'text-white/40'}`}>
                           {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                         </span>
                         {item.leader_name && (
                           <span className="text-[9px] text-white/30 relative z-10 mt-0.5 truncate max-w-full">{item.leader_name}</span>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {/* 热门股票排行卡片 */}
          {hotStocks.length > 0 && (
            <div className="section-card relative group/card flex flex-col">
              <div className="section-header pb-2 mb-3 border-b border-white/5">
                <div className="section-title-wrap">
                  <div className="ai-tag">HOT</div>
                  <h3 className="section-title-text pt-1">热门股票</h3>
                </div>
                <button onClick={() => onNavigate?.('market')} className="text-[9px] text-secondary hover:underline">查看全部</button>
              </div>
              <div className="flex flex-col gap-1.5">
                {hotStocks.slice(0, 5).map((stock, i) => {
                  const pct = stock.change_pct || 0;
                  return (
                    <div key={stock.symbol} onClick={() => onSelectStock?.(stock.symbol)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group/row">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/20 w-4">{i + 1}</span>
                        <span className="text-xs font-black text-white group-hover/row:text-secondary transition-colors">{stock.name || stock.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/50">¥{(stock.close || 0).toFixed(2)}</span>
                        <span className={`text-[10px] font-black w-14 text-right ${pct >= 0 ? 'text-up' : 'text-down'}`}>
                          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 今日交易统计卡片 */}
          {portfolio?.history?.length > 0 && <TodayStats portfolio={portfolio} />}
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-8 min-h-0">
          {/* Asset Value Card */}
          {activeCards.assets && (
            <div id="assets-zone" className="section-card flex-none relative group/card">
               <div className="section-header">
                  <div className="section-title-wrap">
                     <div className="ai-tag">PORTFOLIO</div>
                     <h3 className="section-title-text pt-1">资产净值 VAL</h3>
                     <HelpTooltip title="资产净值" text="总资产 = 可用现金 + 所有持仓的当前市值。净值曲线反映账户整体表现。" />
                  </div>
               </div>
               <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">Total Equity</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-black font-brand tracking-tighter text-white">¥{(portfolio.total_assets || 0).toLocaleString()}</p>
                      <span className={`text-sm font-black ${portfolio.total_pnl_pct >= 0 ? 'text-up' : 'text-down'}`}>
                        {portfolio.total_pnl_pct >= 0 ? '+' : ''}{portfolio.total_pnl_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">可用现金</p>
                      <p className="text-sm font-black text-white">¥{(portfolio.cash || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">持仓市值</p>
                      <p className="text-sm font-black text-white">¥{((portfolio.total_assets || 0) - (portfolio.cash || 0)).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">累计盈亏</p>
                      <p className={`text-sm font-black ${(portfolio.total_pnl || 0) >= 0 ? 'text-up' : 'text-down'}`}>
                        {(portfolio.total_pnl || 0) >= 0 ? '+' : ''}¥{(portfolio.total_pnl || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">持仓数量</p>
                      <p className="text-sm font-black text-white">{Object.keys(portfolio.holdings || {}).length} 只</p>
                    </div>
                  </div>
                  {/* Extended metrics - Task 5 */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">今日盈亏</p>
                      <p className={`text-sm font-black ${(portfolio.metrics?.pnl_1d || 0) >= 0 ? 'text-up' : 'text-down'}`}>
                        {(portfolio.metrics?.pnl_1d || 0) >= 0 ? '+' : ''}¥{(portfolio.metrics?.pnl_1d || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">持仓胜率</p>
                      <p className="text-sm font-black text-secondary">
                        {portfolio.metrics?.win_rate != null ? `${(portfolio.metrics.win_rate * 100).toFixed(1)}%` : '--'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">最大回撤</p>
                      <p className="text-sm font-black text-down">
                        {portfolio.metrics?.mdd != null ? `-${(portfolio.metrics.mdd * 100).toFixed(1)}%` : '--'}
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* AI Advisor Chat */}
          {activeCards.ai && (
            <div id="ai-zone" className="section-card flex-none min-h-[460px] relative group/card" style={{ resize: 'vertical', overflow: 'auto', minHeight: '460px' }}>
               {!user && (
                 <div className="mb-3 px-3 py-2 bg-secondary/5 border border-secondary/20 rounded-xl flex items-center justify-between">
                   <span className="text-[11px] text-white/50">登录后可保存对话历史，游客限5条消息</span>
                   <button onClick={onOpenAuth} className="text-[10px] font-black text-secondary hover:underline">登录</button>
                 </div>
               )}
               <div className="section-header">
                  <div className="section-title-wrap">
                     <div className="ai-tag ai-special">AI</div>
                     <h3 className="section-title-text pt-1">YOUNGQUANT-V1</h3>
                     <HelpTooltip title="AI 对话助手" text="基于 YoungQuant V1 模型，可回答行情分析、策略建议、风险管理等问题。结合当前股票数据给出专业解答。" />
                  </div>
                  <button className="section-action-btn" onClick={() => setShowDeepAnalysis(true)}>生成研报</button>
               </div>
               <ChatTerminal symbol={currentSym} price={price} period={period} stockName={stocks[currentSym]} />
            </div>
          )}

          {/* 自选股快速访问卡片 */}
          <div className="section-card flex-none relative group/card">
            <div className="section-header pb-2 mb-3 border-b border-white/5">
              <div className="section-title-wrap">
                <div className="ai-tag">WATCH</div>
                <h3 className="section-title-text pt-1">自选股</h3>
              </div>
              {user && (
                <button onClick={() => onNavigate?.('personal')} className="text-[9px] text-secondary hover:underline">管理</button>
              )}
            </div>
            {!user ? (
              <p className="text-xs text-white/30 text-center py-4">登录后使用自选股功能</p>
            ) : (
              <WatchlistQuick token={user ? localStorage.getItem('yq_token') : null} onSelectStock={onSelectStock} />
            )}
          </div>

          {/* 新手任务清单 — 仅对新用户显示 */}
          {!localStorage.getItem('yq_checklist_dismissed') && (
            <NewUserChecklist onNavigate={onNavigate} />
          )}

          {/* 每日课堂卡片 */}
          <div className="section-card flex-none relative group/card">
            <div className="section-header pb-2 mb-3 border-b border-white/5">
              <div className="section-title-wrap">
                <div className="ai-tag bg-yellow-500/10 text-yellow-400">DAILY</div>
                <h3 className="section-title-text pt-1">今日课堂</h3>
              </div>
              <button onClick={() => onNavigate?.('learning')} className="text-[9px] text-secondary hover:underline">更多</button>
            </div>
            <DailyLessonMini token={user ? localStorage.getItem('yq_token') : null} />
          </div>

          {/* AI 信号历史卡片 */}
          <div className="section-card flex-none relative group/card">
            <div className="section-header pb-2 mb-3 border-b border-white/5">
              <div className="section-title-wrap">
                <div className="ai-tag ai-special">SIGNAL</div>
                <h3 className="section-title-text pt-1">AI 信号参考</h3>
                <HelpTooltip title="AI 交易信号" text="BUY=建议买入，SELL=建议卖出，HOLD=建议持有观望。置信度越高代表模型对该判断越确定。仅供参考，不构成投资建议。" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { sym: currentSym, name: stocks[currentSym] || currentSym, signal: signalInfo.signal, conf: signalInfo.confidence },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <p className="text-xs font-black text-white">{item.name}</p>
                    <p className="text-[9px] text-white/30">{period === 'daily' ? '日线' : '15分钟线'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                      item.signal === 'BUY' ? 'bg-up/20 text-up' :
                      item.signal === 'SELL' ? 'bg-down/20 text-down' :
                      'bg-white/10 text-white/40'
                    }`}>{item.signal}</span>
                    <span className="text-[9px] text-white/30">{Math.round((item.conf || 0) * 100)}%</span>
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-white/20 text-center mt-1">AI 信号仅供参考，不构成投资建议</p>
            </div>
          </div>

          {/* 风险提示卡片 */}
          <div className="section-card flex-none relative group/card">
            <div className="section-header pb-2 mb-3 border-b border-white/5">
              <div className="section-title-wrap">
                <div className="ai-tag bg-yellow-500/10 text-yellow-400">RISK</div>
                <h3 className="section-title-text pt-1">风险提示</h3>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {Object.keys(portfolio?.holdings || {}).length === 0 ? (
                <p className="text-xs text-white/30 text-center py-3">暂无持仓，无风险提示</p>
              ) : (
                Object.entries(portfolio.holdings || {}).map(([sym, h]) => {
                  const pnlPct = h.pnl_pct || 0;
                  if (Math.abs(pnlPct) < 5) return null;
                  return (
                    <div key={sym} className={`flex items-center gap-2 p-2.5 rounded-xl border ${pnlPct <= -10 ? 'bg-down/10 border-down/20' : pnlPct >= 8 ? 'bg-up/10 border-up/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                      <span className={`text-[10px] font-black ${pnlPct <= -10 ? 'text-down' : pnlPct >= 8 ? 'text-up' : 'text-yellow-400'}`}>
                        {pnlPct <= -10 ? '止损提示' : pnlPct >= 8 ? '止盈提示' : '注意'}
                      </span>
                      <span className="text-xs text-white/60">{h.name || sym}</span>
                      <span className={`text-xs font-black ml-auto ${pnlPct >= 0 ? 'text-up' : 'text-down'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  );
                }).filter(Boolean)
              )}
              {Object.keys(portfolio?.holdings || {}).length > 0 && Object.values(portfolio.holdings).every(h => Math.abs(h.pnl_pct || 0) < 5) && (
                <p className="text-xs text-white/30 text-center py-2">持仓波动正常，无需特别关注</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* StockScreener Modal — portal to body */}
      {showScreener && createPortal(
        <div className="fixed inset-0 z-[99500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowScreener(false)} />
          <div className="w-full max-w-lg relative z-10 p-8 bg-[#0a0a0b] border border-secondary/20 rounded-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">AI 智能选股</h2>
              <button onClick={() => setShowScreener(false)} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
            </div>
            <StockScreener
              token={user ? localStorage.getItem('yq_token') : null}
              onSelectStock={(sym) => { onSelectStock(sym); setShowScreener(false); }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Deep Analysis Modal */}
      {showDeepAnalysis && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeepAnalysis(false)}></div>
          <div className="section-card w-full max-w-xl relative z-10 p-12 text-center bg-bg-deep/90 border-secondary/20 shadow-2xl">
            <div className="ai-tag mb-8 mx-auto w-fit">AI ANALYSIS</div>
            <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter italic">智能归因深度研报</h2>
            {aiLoading ? (
              <div className="py-20 animate-pulse text-white/20 font-black italic">正在深度归因...</div>
            ) : aiError ? (
              <div className="py-20 text-down font-black italic">{aiError}</div>
            ) : aiReport ? (
              <div className="flex flex-col gap-4 text-left">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase ${aiReport.signal === 'BUY' ? 'bg-up text-white' : aiReport.signal === 'SELL' ? 'bg-down text-white' : 'bg-secondary text-black'}`}>
                      {aiReport.signal}
                    </span>
                    <span className="text-xs font-black text-white/40 tracking-widest">{Math.round((aiReport.confidence || 0) * 100)}% 置信度</span>
                  </div>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-text-dim leading-relaxed"><b className="text-white">分析结论：</b>{aiReport.reason}</p>
                    <p className="text-sm text-text-dim leading-relaxed"><b className="text-white">核心风险：</b>{aiReport.risk}</p>
                  </div>
                  <Button onClick={() => setShowDeepAnalysis(false)} className="w-full bg-secondary text-black font-black py-4 rounded-2xl">收 到 CONFIRM</Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
};


const DeepAnalysis = ({ currentSym, period, availability, availabilityLoading, user, onOpenAuth }) => {
  const [activeTab, setActiveTab] = useState('sentiment');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
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
        if (!res.ok) throw new Error('AI Advisor failed');
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
  }, [currentSym, period, availability, availabilityLoading, user]);

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
  
  if (!user) {
    return (
      <div className="p-10 h-[calc(100vh-80px)] flex flex-col items-center justify-center animate-fade-in bg-bg-deep">
        <div className="section-card max-w-lg p-16 text-center shadow-2xl border-secondary/20 bg-secondary/5 backdrop-blur-xl">
          <div className="w-20 h-20 bg-secondary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
            <ShieldCheck size={40} className="text-secondary" />
          </div>
          <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter">解锁投研分析中心</h2>
          <p className="text-text-dim text-lg mb-10 font-medium leading-relaxed">
            深度投研报告、AI 情绪归因及预测空间仅对注册用户开放。立即登录解锁 Pro 级交易洞察。
          </p>
          <button onClick={onOpenAuth} className="btn-pro btn-pro-teal w-full py-6 text-xl">
            立即登录解锁 UNLOCK PRO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 h-[calc(100vh-80px)] flex flex-col gap-10 animate-fade-in overflow-y-auto font-sans">
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
          { id: 'sentiment', label: '市场情绪', icon: <span><TrendingUp size={18}/> <HelpTooltip title="市场情绪" text="通过 NLP 模型分析全网财经新闻、社交媒体情绪，量化为 0-100 的情绪指数。" /></span> },
          { id: 'technical', label: '技术指标评分', icon: <span><Activity size={18}/> <HelpTooltip title="技术指标" text="综合 MA, RSI, MACD 等 12 个核心技术指标的加权评分。" /></span> },
          { id: 'predictor', label: 'AI 预测空间', icon: <span><PieChart size={18}/> <HelpTooltip title="AI 预测" text="基于 LSTM 长短期记忆网络对未来 3-5 个周期的涨跌空间进行概率预测。" /></span> }
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

// 模拟盘就绪提示（每次会话显示一次）
const SimReadyToast = ({ portfolio, user }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const key = 'yq_sim_toast_shown';
    if (!sessionStorage.getItem(key) && (portfolio?.total_assets > 0 || portfolio?.cash > 0)) {
      sessionStorage.setItem(key, '1');
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [portfolio?.cash]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 px-5 py-3 bg-[#0a0a0b] border border-secondary/30 rounded-2xl shadow-2xl shadow-secondary/10">
        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        <div>
          <p className="text-xs font-black text-white">
            {user ? `欢迎回来，${user.name}` : '模拟盘已就绪'}
          </p>
          <p className="text-[10px] text-white/40">
            可用资金 ¥{(portfolio?.cash || 0).toLocaleString()} · 右侧交易台可直接下单
          </p>
        </div>
        <button onClick={() => setVisible(false)} className="text-white/20 hover:text-white ml-2 text-sm">✕</button>
      </div>
    </div>
  );
};

// 新用户欢迎引导（注册后首次进入）
const NewUserWelcome = ({ user, onDismiss, onNavigate }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    const key = `yq_welcome_shown_${user.name}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      setVisible(true);
    }
  }, [user]);

  const dismiss = () => { setVisible(false); onDismiss?.(); };

  if (!visible || !user) return null;

  const STEPS = [
    { icon: '📈', title: '查看 K 线行情', desc: '左侧图表展示实时 K 线，可切换日线/15分钟线', action: null },
    { icon: '🤖', title: '问 AI 助手', desc: '右侧对话框可以问任何股票问题', action: null },
    { icon: '💰', title: '开始模拟交易', desc: `你有 ¥${(100000).toLocaleString()} 虚拟资金，点击"交易台"下单`, action: 'trade' },
    { icon: '📚', title: '每日学习', desc: '学习中心有 60 天系统课程，每天 5 分钟', action: 'learning' },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 md:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-md bg-[#0a0a0b] border border-secondary/30 rounded-3xl p-6 shadow-2xl shadow-secondary/10 animate-in slide-in-from-bottom-8 fade-in duration-400">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-[10px] font-black text-secondary uppercase tracking-widest mb-2">
              <span className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
              欢迎加入
            </div>
            <h3 className="text-lg font-black text-white">你好，{user.name} 👋</h3>
            <p className="text-xs text-white/40 mt-0.5">账户已就绪，这里是快速上手指南</p>
          </div>
          <button onClick={dismiss} className="text-white/20 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {STEPS.map((step, i) => (
            <div
              key={i}
              onClick={() => { if (step.action) { onNavigate?.(step.action); dismiss(); } }}
              className={`p-3 bg-white/5 border border-white/8 rounded-2xl ${step.action ? 'cursor-pointer hover:border-secondary/30 hover:bg-secondary/5 transition-all' : ''}`}
            >
              <span className="text-xl mb-1.5 block">{step.icon}</span>
              <p className="text-xs font-black text-white mb-0.5">{step.title}</p>
              <p className="text-[10px] text-white/40 leading-relaxed">{step.desc}</p>
              {step.action && <p className="text-[10px] text-secondary mt-1">点击前往 →</p>}
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="w-full py-2.5 bg-secondary text-black font-black text-sm rounded-2xl hover:brightness-110 transition-all"
        >
          开始探索
        </button>
      </div>
    </div>
  );
};

function App() {
  const [currentSym, setCurrentSymRaw] = React.useState(
    () => localStorage.getItem('yq_last_sym') || '601899'
  );
  const setCurrentSym = React.useCallback((sym) => {
    localStorage.setItem('yq_last_sym', sym);
    setCurrentSymRaw(sym);
  }, []);
  const [portfolio, setPortfolio] = useState({ holdings: {}, history: [], cash: 0, total_assets: 0 });
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [period, setPeriod] = useState('15');
  const [logs, setLogs] = useState([]);
  // Keep this declaration before any callback that uses it (avoid TDZ runtime errors).
  const addLog = useCallback((msg) => setLogs(prev => [msg, ...prev].slice(0, 50)), []);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshModal, setRefreshModal] = useState({ open: false, steps: [], done: false, duration: '' });
  const [showRefreshInfo, setShowRefreshInfo] = useState(false);
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const [signalInfo, setSignalInfo] = useState({ signal: 'HOLD', confidence: 0, date: '' });
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [_availabilityError, setAvailabilityError] = useState('');
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [appPage, setAppPage] = useState('dashboard'); // 'dashboard' | 'learning' | 'personal' | 'leaderboard' | 'market' | 'strategy'
  
  // 首次访问未登录用户显示落地页
  const [showLanding, setShowLanding] = useState(() => {
    return !localStorage.getItem('yq_token') && !sessionStorage.getItem('yq_entered');
  });

  // 新手引导：没有 token 且没做过 onboarding 的用户先走引导流程
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('yq_token') && !localStorage.getItem('yq_onboarding_done') && !sessionStorage.getItem('yq_entered');
  });
  
  // Modals & Session State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [subPage, setSubPage] = useState(null); // 'stock-guide' | 'trade-guide' | 'position' | 'ai-guide'

  const [authGateEnabled, setAuthGateEnabled] = useState(true);
  const [authGateVisible, setAuthGateVisible] = useState(true);
  const [showRiskEducation, setShowRiskEducation] = useState(false);
  
  const navigate = useCallback((to) => {
    if (window.location.pathname === to) return;
    window.history.pushState({}, '', to);
    setPathname(to);
  }, []);

  // 监听全局导航事件（DailyLesson 等子组件触发）
  useEffect(() => {
    const handler = (e) => {
      const { page } = e.detail || {};
      if (page) setAppPage(page);
    };
    window.addEventListener('yq:navigate', handler);
    return () => window.removeEventListener('yq:navigate', handler);
  }, []);

  const openTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setTutorialStep(0);
    setAuthGateEnabled(false);
    setAuthGateVisible(false);
    document.body.style.overflow = 'hidden';
  }, []);

  const finishTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setAuthGateEnabled(true);
    setAuthGateVisible(true);
    document.body.style.overflow = '';
  }, []);

  // Auth initialization
  useEffect(() => {
    const token = localStorage.getItem('yq_token');
    const storedUser = localStorage.getItem('yq_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('yq_token');
        localStorage.removeItem('yq_user');
      }
    }
  }, []);

  const onLogout = useCallback(() => {
    localStorage.removeItem('yq_token');
    localStorage.removeItem('yq_user');
    setUser(null);
    window.location.reload();
  }, []);

  const onAuthSuccess = useCallback((authData) => {
    localStorage.setItem('yq_token', authData.token);
    localStorage.setItem('yq_user', JSON.stringify(authData.user));
    setUser(authData.user);
    addLog(`[系统] 欢迎回归, ${authData.user.name}`);
    // 登录后立即用 token 刷新资产（不依赖 user state 更新时机）
    setTimeout(() => {
      const token = authData.token;
      fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setPortfolio(data))
        .catch(() => {});
    }, 100);
  }, [addLog]);

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('yq_token');
    const headers = {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && user) {
      localStorage.removeItem('yq_token');
      localStorage.removeItem('yq_user');
      setUser(null);
    }
    return res;
  }, [user]);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const GUEST_PORTFOLIO_KEY = 'yq_guest_portfolio';
  const DEFAULT_GUEST_PORTFOLIO = { cash: 100000, total_assets: 100000, holdings: {}, history: [], total_pnl: 0, total_pnl_pct: 0 };

  const fetchPortfolio = useCallback(async () => {
    if (!user) {
      // Guest: load from localStorage
      try {
        const stored = localStorage.getItem(GUEST_PORTFOLIO_KEY);
        if (stored) {
          setPortfolio(JSON.parse(stored));
        } else {
          setPortfolio(DEFAULT_GUEST_PORTFOLIO);
        }
      } catch {
        setPortfolio(DEFAULT_GUEST_PORTFOLIO);
      }
      return;
    }
    setPortfolioLoading(true);
    try {
      const res = await authenticatedFetch(`/api/portfolio?period=${period}&_=` + Date.now());
      const data = await res.json();
      if (data && !data.error) setPortfolio(data);
    } catch { /* silent fail */ } finally {
      setPortfolioLoading(false);
    }
  }, [period, user, authenticatedFetch]);

  const fetchSignal = useCallback(async () => {
    setSignalLoading(true);
    setSignalError('');
    try {
      const res = await fetch(`/api/signal?symbol=${currentSym}&period=${period}&_=` + Date.now());
      if (!res.ok) throw new Error('信号数据拉取异常');
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
      if (!res.ok) throw new Error('可用性检测失败');
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
    fetchPortfolio();
    const timer = setInterval(fetchPortfolio, 10000);
    return () => clearInterval(timer);
  }, [fetchPortfolio]);

  // Persist guest portfolio to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('yq_guest_portfolio', JSON.stringify(portfolio));
    }
  }, [portfolio, user]);

  useEffect(() => {
    fetchSignal();
  }, [fetchSignal]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const onRefreshPipeline = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshModal({ open: true, steps: [], done: false, duration: '' });

    try {
      const prettyPeriod = period === 'daily' ? '1D' : `${period}m`;
      addLog(`[系统] 开始重训流水线：${currentSym} / ${prettyPeriod}`);
      setRefreshModal(m => ({ ...m, steps: [`开始重训：${currentSym} / ${prettyPeriod}`] }));

      const res = await fetch(`/api/refresh?symbol=${currentSym}&period=${period}`);
      const data = await res.json();

      if (data?.status === 'cooldown') {
        addLog(`[系统] ${data.msg}`);
        setRefreshModal(m => ({ ...m, steps: [...m.steps, `⏳ ${data.msg}`], done: true }));
        return;
      }

      if (data?.steps?.length) {
        data.steps.forEach(s => {
          addLog(`[刷新] ${s}`);
          setRefreshModal(m => ({ ...m, steps: [...m.steps, s] }));
        });
      }

      if (data?.duration) {
        addLog(`[系统] 重训结束，耗时 ${data.duration}`);
        setRefreshModal(m => ({ ...m, done: true, duration: data.duration }));
      }
    } catch {
      addLog('[系统] 重训失败，请稍后再试。');
      setRefreshModal(m => ({ ...m, steps: [...m.steps, '❌ 重训失败，请稍后再试'], done: true }));
    } finally {
      setRefreshing(false);
      await fetchPortfolio();
      await fetchSignal();
      await fetchAvailability();
    }
  }, [refreshing, period, currentSym, addLog, fetchPortfolio, fetchSignal, fetchAvailability]);

  return (
    <ToastProvider>
    <SSEListener user={user} onOrderFilled={() => { fetchPortfolio(); setOrderRefreshKey(k => k + 1); }} onAddLog={addLog} />
    {showOnboarding && (
      <OnboardingFlow onComplete={() => {
        localStorage.setItem('yq_onboarding_done', '1');
        setShowOnboarding(false);
      }} />
    )}
    <div className={`min-h-screen flex flex-col transition-all duration-300 bg-bg-deep`}>
      {/* 落地页 */}
      {showLanding && (
        <LandingPage
          onEnter={() => { sessionStorage.setItem('yq_entered', '1'); setShowLanding(false); }}
          onOpenAuth={() => { sessionStorage.setItem('yq_entered', '1'); setShowLanding(false); setAuthModalOpen(true); }}
        />
      )}
      {!showLanding && (<>
      {pathname !== '/docs' && (
        <Header 
          currentSym={currentSym} 
          period={period}
          refreshing={refreshing}
          onRefreshPipeline={onRefreshPipeline}
            onOpenRefreshInfo={() => setShowRefreshInfo(true)}
          onSelectStock={setCurrentSym} 
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenTutorial={openTutorial}
          onLogout={onLogout}
          portfolio={portfolio}
          onNavigate={setAppPage}
          currentPage={appPage}
        />
      )}
      <main className="flex-1 relative pb-16 md:pb-0">
        <ErrorBoundary>
        {pathname === '/docs' || appPage === 'docs' ? (
          <EvidenceDocs onBack={() => { navigate('/'); setAppPage('dashboard'); }} />
        ) : pathname === '/analysis' ? (
          <DeepAnalysis
            currentSym={currentSym}
            period={period}
            availability={availability}
            availabilityLoading={availabilityLoading}
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        ) : appPage === 'learning' ? (
          <LearningCenter token={user ? localStorage.getItem('yq_token') : null} onBack={() => setAppPage('dashboard')} />
        ) : appPage === 'personal' ? (
          <PersonalCenter
            token={user ? localStorage.getItem('yq_token') : null}
            portfolio={portfolio}
            onSelectStock={(sym) => { setCurrentSym(sym); setAppPage('dashboard'); }}
            onBack={() => setAppPage('dashboard')}
            user={user}
            onNavigate={setAppPage}
          />
        ) : appPage === 'leaderboard' ? (
          <Leaderboard token={user ? localStorage.getItem('yq_token') : null} onBack={() => setAppPage('dashboard')} />
        ) : appPage === 'market' ? (
          <MarketPage onSelectStock={(sym) => { setCurrentSym(sym); setAppPage('dashboard'); }} onBack={() => setAppPage('dashboard')} />
        ) : appPage === 'strategy' ? (
          <StrategyPage onBack={() => setAppPage('dashboard')} token={user ? localStorage.getItem('yq_token') : null} currentSym={currentSym} />
        ) : (
          <Dashboard 
            currentSym={currentSym} 
            portfolio={portfolio} 
            portfolioLoading={portfolioLoading}
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
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            authGateEnabled={authGateEnabled}
            authGateVisible={authGateVisible}
            onSelectStock={setCurrentSym}
            subPage={subPage}
            setSubPage={setSubPage}
            onNavigate={setAppPage}
            orderRefreshKey={orderRefreshKey}
          />
        )}
        </ErrorBoundary>
      </main>

      <div className="pointer-events-auto">
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          onSuccess={onAuthSuccess}
        />
        
        {isTutorialActive && (
          <TutorialTour 
            step={tutorialStep}
            onNext={(dir = 1) => setTutorialStep(s => Math.max(0, s + (typeof dir === 'number' ? dir : 1)))}
            onSkip={finishTutorial}
            onComplete={finishTutorial}
            onNavigate={setAppPage}
          />
        )}

        {/* 模拟盘就绪提示 — 每次会话首次显示 */}
        <SimReadyToast portfolio={portfolio} user={user} />
        {/* 新用户欢迎引导 */}
        <NewUserWelcome user={user} onNavigate={setAppPage} />
        {/* 移动端底部导航 */}
        <MobileNav currentPage={appPage} onNavigate={setAppPage} user={user} />
      </div>

      {/* 更新 AI 信号说明弹窗 */}
      {showRefreshInfo && createPortal(
        <div className="fixed inset-0 z-[99800] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRefreshInfo(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <RefreshCw size={16} className="text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">更新 AI 信号</h3>
                <p className="text-[10px] text-white/30">了解这个操作在做什么</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-xs font-black text-white mb-2">这个操作会做什么？</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  用当前股票的最新历史数据，重新训练 XGBoost 机器学习模型，然后更新 K 线图上的 BUY / SELL / HOLD 信号。
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-xs font-black text-white mb-2">模型会越训越好吗？</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  不会自动变好。每次重训都是从头开始，没有"记忆"。重训的意义是让模型<span className="text-white/80">适应最近的市场风格</span>——如果市场风格切换了（比如从牛市转熊市），重训后的信号可能更贴近当前行情。
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-xs font-black text-white mb-2">K 线图需要点这个才更新吗？</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  不需要。K 线数据每天 15:35 自动更新，服务器启动时也会自动补齐。这个按钮只影响 AI 信号，不影响 K 线图本身。
                </p>
              </div>

              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4">
                <p className="text-xs font-black text-secondary mb-1">建议使用频率</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  每周一次，或者当你觉得信号明显不准时。耗时约 30-60 秒。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRefreshInfo(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white transition-all">
                取消
              </button>
              <button onClick={() => { setShowRefreshInfo(false); onRefreshPipeline(); }}
                className="flex-1 py-2.5 bg-secondary text-black font-black text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={13} />
                确认更新
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 重训流水线进度弹窗 */}
      {refreshModal.open && createPortal(
        <div className="fixed inset-0 z-[99800] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setRefreshModal(m => ({ ...m, open: false }))} />
          <div className="relative z-10 w-full max-w-3xl bg-[#0a0a0b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex">

            {/* ── 左侧：模型流程介绍 ── */}
            <div className="w-72 flex-shrink-0 bg-white/[0.02] border-r border-white/5 p-6 flex flex-col gap-6">
              <div>
                <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-1">YoungQuant V1</p>
                <h3 className="text-sm font-black text-white">AI 信号训练流程</h3>
                <p className="text-[10px] text-white/30 mt-1 leading-relaxed">K线数据每天自动更新，此流程专门用于重新训练 AI 交易信号模型。</p>
              </div>

              {/* 流程时间线 */}
              <div className="flex flex-col gap-0">
                {[
                  {
                    step: '01',
                    name: '数据获取',
                    tag: 'fetch_data.py',
                    desc: '通过 AkShare 从东方财富拉取最新 K 线数据，存入 SQLite',
                    detail: '日线 / 15分钟线 · 前复权',
                    keyword: '数据获取',
                  },
                  {
                    step: '02',
                    name: '特征工程',
                    tag: 'prepare_features.py',
                    desc: '计算 MA5/MA20、RSI14、MACD 等技术指标，生成模型输入特征',
                    detail: '6 维特征向量',
                    keyword: '特征工程',
                  },
                  {
                    step: '03',
                    name: '模型训练',
                    tag: 'train_model.py',
                    desc: 'XGBoost 分类器学习历史价格模式，预测下一周期涨跌方向',
                    detail: 'n=300, depth=6, lr=0.05',
                    keyword: '模型训练',
                  },
                  {
                    step: '04',
                    name: '回测评估',
                    tag: 'backtest.py',
                    desc: '在历史数据上验证模型信号，计算胜率、最大回撤、夏普比率',
                    detail: 'MA金叉 / MACD零轴',
                    keyword: '回测评估',
                  },
                ].map((item, i, arr) => {
                  const isDone = refreshModal.steps.some(s => s.includes(item.keyword) && s.includes('完成'));
                  const isActive = !isDone && !refreshModal.done && refreshModal.steps.some(s => s.includes(item.keyword));
                  const isFailed = refreshModal.steps.some(s => s.includes(item.keyword) && s.includes('失败'));
                  return (
                    <div key={item.step} className="flex gap-3">
                      {/* 竖线 + 圆点 */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 transition-all duration-500 ${
                          isFailed ? 'bg-down/20 text-down border border-down/30' :
                          isDone ? 'bg-secondary/20 text-secondary border border-secondary/30' :
                          isActive ? 'bg-up/20 text-up border border-up/30 animate-pulse' :
                          'bg-white/5 text-white/20 border border-white/10'
                        }`}>{isDone ? '✓' : isFailed ? '✕' : item.step}</div>
                        {i < arr.length - 1 && (
                          <div className={`w-px flex-1 my-1 min-h-[24px] transition-all duration-500 ${isDone ? 'bg-secondary/30' : 'bg-white/5'}`} />
                        )}
                      </div>
                      {/* 内容 */}
                      <div className={`pb-5 flex-1 transition-all duration-300 ${isActive ? 'opacity-100' : isDone ? 'opacity-70' : 'opacity-40'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-white">{item.name}</span>
                          {isActive && <span className="text-[8px] text-up font-black animate-pulse">运行中</span>}
                        </div>
                        <p className="text-[9px] text-white/30 font-mono mb-1">{item.tag}</p>
                        <p className="text-[10px] text-white/40 leading-relaxed">{item.desc}</p>
                        <p className="text-[9px] text-white/20 mt-1">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-white/5">
                <p className="text-[9px] text-white/20 leading-relaxed">
                  训练完成后，K线图信号将自动更新。每只股票独立训练，互不影响。
                </p>
              </div>
            </div>

            {/* ── 右侧：实时进度 ── */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${refreshModal.done ? 'bg-secondary' : 'bg-up animate-pulse'}`} />
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {refreshModal.done ? 'AI 信号更新完成' : 'AI 信号更新中'}
                    </h3>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      重新训练模型 · 更新 BUY/SELL/HOLD 信号
                    </p>
                  </div>
                </div>
                {refreshModal.done && (
                  <button onClick={() => setRefreshModal(m => ({ ...m, open: false }))}
                    className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
                )}
                {!refreshModal.done && (
                  <button onClick={() => setRefreshModal(m => ({ ...m, open: false }))}
                    className="text-[10px] text-white/25 hover:text-white/60 transition-colors border border-white/10 px-2 py-1 rounded-lg">
                    后台运行
                  </button>
                )}
              </div>

              {/* 进度日志 */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0 max-h-64">
                {refreshModal.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`shrink-0 mt-0.5 font-black ${
                      s.includes('失败') || s.includes('❌') ? 'text-down' :
                      s.includes('完成') || s.includes('✓') ? 'text-secondary' :
                      s.includes('⏳') ? 'text-yellow-400' : 'text-white/30'
                    }`}>›</span>
                    <span className={`leading-relaxed ${
                      s.includes('失败') ? 'text-down/80' :
                      s.includes('完成') ? 'text-white/70' : 'text-white/50'
                    }`}>{s}</span>
                  </div>
                ))}
                {!refreshModal.done && (
                  <div className="flex items-center gap-2 text-xs text-white/25 mt-2">
                    <div className="w-3 h-3 border border-white/15 border-t-secondary rounded-full animate-spin flex-shrink-0" />
                    <span>处理中，约 30–60 秒...</span>
                  </div>
                )}
              </div>

              {/* 完成后的结果摘要 */}
              {refreshModal.done && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">耗时</p>
                      <p className="text-sm font-black text-white">{refreshModal.duration || '--'}</p>
                    </div>
                    <div className="bg-secondary/5 rounded-xl p-3 border border-secondary/20">
                      <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">状态</p>
                      <p className="text-sm font-black text-secondary">
                        {refreshModal.steps.some(s => s.includes('失败')) ? '部分失败' : '全部完成'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/25 mt-3">
                    K线图和 AI 信号已更新，刷新页面可查看最新数据。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      </>)}
    </div>
    </ToastProvider>
  );
}
export default App;
