import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Loader2, Info, ShieldCheck, Clock, X } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRiskGuard } from './RiskGuard';
import { useToast } from './Toast';

// ── 挂单列表 ──────────────────────────────────────────────
const OrderList = ({ token, refreshKey }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setOrders(d.orders || []); }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders, refreshKey]);

  const cancel = async (id) => {
    if (!token) return;
    await fetch(`/api/orders/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchOrders();
  };

  if (!token) return <p className="text-xs text-white/30 text-center py-6">登录后查看挂单</p>;
  if (loading) return <p className="text-xs text-white/30 text-center py-6 animate-pulse">加载中...</p>;
  if (orders.length === 0) return <p className="text-xs text-white/30 text-center py-6">暂无挂单</p>;

  return (
    <div className="flex flex-col gap-2">
      {orders.map(o => (
        <div key={o.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs ${
          o.status === 'pending' ? 'bg-white/5 border-white/8' :
          o.status === 'filled' ? 'bg-secondary/5 border-secondary/20' :
          'bg-white/[0.02] border-white/5 opacity-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-black text-[10px] px-1.5 py-0.5 rounded-md ${o.action === 'buy' ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>
              {o.action === 'buy' ? '买' : '卖'}
            </span>
            <span className="text-white/70 font-black">{o.name || o.symbol}</span>
            <span className="text-white/40">{o.qty}股</span>
            <span className="text-white/60 font-black">@¥{o.limit_price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            {o.status === 'pending' && (
              <span className="text-[9px] text-yellow-400/70 flex items-center gap-1">
                <Clock size={9} />待成交
              </span>
            )}
            {o.status === 'filled' && (
              <span className="text-[9px] text-secondary">已成交 @¥{o.filled_price?.toFixed(2)}</span>
            )}
            {o.status === 'cancelled' && (
              <span className="text-[9px] text-white/30">已撤销</span>
            )}
            {o.status === 'pending' && (
              <button onClick={() => cancel(o.id)} className="text-white/20 hover:text-down transition-colors ml-1">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── 主组件 ────────────────────────────────────────────────
const TradePanel = ({
  symbol, price: priceProp, cash, stockName, suggestedSignal,
  availability, availabilityLoading, onTradeSuccess, portfolio,
  orderRefreshKey
}) => {
  const [tab, setTab] = useState('market'); // 'market' | 'limit' | 'orders'
  const [qty, setQty] = useState(100);
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [latestPrice, setLatestPrice] = useState(0);
  const toast = useToast();
  const token = localStorage.getItem('yq_token');

  // 从 stock_bars 获取最新价格（不依赖 K 线图回调）
  useEffect(() => {
    if (!symbol) return;
    const fetchLatestPrice = async () => {
      try {
        // 先试 daily，再试 15m
        const res = await fetch(`/api/indicators?symbol=${symbol}&period=daily`);
        const data = await res.json();
        const bars = data.data || [];
        if (bars.length > 0) {
          setLatestPrice(parseFloat(bars[bars.length - 1].close) || 0);
          return;
        }
        // fallback: 15m
        const res2 = await fetch(`/api/indicators?symbol=${symbol}&period=15`);
        const data2 = await res2.json();
        const bars2 = data2.data || [];
        if (bars2.length > 0) {
          setLatestPrice(parseFloat(bars2[bars2.length - 1].close) || 0);
        }
      } catch {}
    };
    fetchLatestPrice();
  }, [symbol]);

  // 优先用 K 线图传入的实时价格，fallback 用 stock_bars 最新价
  const price = priceProp > 0 ? priceProp : latestPrice;

  const tradeAmount = price > 0 ? parseFloat(qty) * price : 0;
  const { warnings, hasWarning } = useRiskGuard(portfolio, tradeAmount);

  const buySuggested = suggestedSignal === 'BUY';
  const sellSuggested = suggestedSignal === 'SELL';
  const maxBuy = price > 0 ? Math.floor(cash / (price * 1.0005) / 100) * 100 : 0;

  const canTrade = useMemo(() => {
    return price > 0;
  }, [price]);

  // 初始化限价为当前价
  useEffect(() => {
    if (price > 0 && !limitPrice) setLimitPrice(price.toFixed(2));
  }, [price]);

  const setPercent = (pct) => {
    if (price <= 0) return;
    const targetQty = Math.floor((cash * pct) / (price * 1.0005) / 100) * 100;
    setQty(targetQty > 0 ? targetQty : 100);
  };

  // ── 市价单 ──
  const handleMarketTrade = (action) => {
    if (price <= 0 || !qty) return;
    const amount = parseFloat(qty) * price;
    const fee = Math.max(amount * 0.0005, 5);
    setConfirmState({ type: 'market', action, qty: parseFloat(qty), amount, fee });
  };

  const executeMarketTrade = async () => {
    if (!confirmState) return;
    const { action, qty: tradeQty } = confirmState;
    setConfirmState(null);

    if (!token) {
      toast.error('请先登录后再进行交易');
      return;
    }

    // 非交易时段提醒（模拟盘仍可交易，但给出提示）
    const now = new Date();
    const day = now.getDay();
    const h = now.getHours(), m = now.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const isTradingHour = !isWeekend && (
      (h > 9 || (h === 9 && m >= 30)) && (h < 11 || (h === 11 && m <= 30)) ||
      (h >= 13 && h < 15)
    );
    if (!isTradingHour) {
      toast.warning('当前为非交易时段（A股交易时间：周一至周五 9:30-11:30, 13:00-15:00），模拟盘以最近收盘价成交', 5000);
    }

    if (hasWarning) {
      // 用 toast 警告，不阻断交易（用户已看到风险提示）
      warnings.forEach(w => toast.warning(w, 5000));
    }
    setLoading(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ symbol, action, price, qty: tradeQty }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onTradeSuccess?.(`[成交] ${action === 'BUY' ? '买入' : '卖出'} ${stockName || symbol} ${tradeQty} 股`);
        // 检查是否是第一笔交易
        const firstTradeKey = 'yq_first_trade_done';
        const isFirst = !localStorage.getItem(firstTradeKey);
        if (isFirst) {
          localStorage.setItem(firstTradeKey, '1');
          toast.success(`首笔交易完成！${action === 'BUY' ? '买入' : '卖出'} ${stockName || symbol} ${tradeQty} 股 · 记得在"历史成交"查看记录`, 6000);
        } else {
          toast.success(`${action === 'BUY' ? '买入' : '卖出'}成功：${stockName || symbol} ${tradeQty} 股 · ¥${(tradeQty * price).toLocaleString()}`);
        }
      } else {
        toast.error('交易失败：' + (data.msg || '未知错误'));
      }
    } catch { toast.error('请求失败，请检查网络'); }
    setLoading(false);
  };

  // ── 限价单 ──
  const handleLimitOrder = async (action) => {
    const lp = parseFloat(limitPrice);
    if (!lp || lp <= 0 || !qty) { toast.error('请输入有效的限价和数量'); return; }
    if (!token) { toast.error('请先登录'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol, action, limit_price: lp, qty: parseFloat(qty) }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(data.msg);
        setTab('orders');
      } else {
        toast.error(data.error || '挂单失败');
      }
    } catch { toast.error('请求失败'); }
    setLoading(false);
  };

  const feeEstimate = (p, q) => Math.max(p * q * 0.0005, 5).toFixed(2);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Tab 切换 */}
      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
        {[
          { key: 'market', label: '市价单' },
          { key: 'limit',  label: '限价单' },
          { key: 'orders', label: '挂单' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${tab === t.key ? 'bg-secondary text-black' : 'text-white/40 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 市价单 */}
      {tab === 'market' && (
        <div className="flex flex-col gap-4 flex-1">
          {/* 状态 */}
          <div className="h-4 flex items-center justify-between">
            {price <= 0 ? (
              <span className="text-[10px] text-white/20 flex items-center gap-2"><Info size={12} />价格加载中...</span>
            ) : (
              <span className="text-[10px] text-secondary flex items-center gap-2">
                <ShieldCheck size={12} />
                就绪 · {priceProp > 0 ? '实时' : '收盘'}价 ¥{price.toFixed(2)}
              </span>
            )}
            {portfolio?.holdings?.[symbol] && (
              <span className="text-[10px] text-white/40">
                持仓 {portfolio.holdings[symbol].shares}股 · 可卖 {portfolio.holdings[symbol].available || 0}股
              </span>
            )}
          </div>

          {/* 数量 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">数量（股）</Label>
              <span className="text-[10px] text-white/30">最多可买 {maxBuy} 股</span>
            </div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full h-14 bg-black/40 border border-white/5 focus:border-secondary/30 text-2xl font-black text-center rounded-2xl outline-none text-white transition-all" />
            {price > 0 && qty > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['金额', `¥${(price * parseFloat(qty||0)).toLocaleString(undefined,{maximumFractionDigits:0})}`],
                  ['手续费', `¥${feeEstimate(price, parseFloat(qty||0))}`],
                  ['合计', `¥${(price * parseFloat(qty||0) * 1.0005).toLocaleString(undefined,{maximumFractionDigits:0})}`]
                ].map(([k,v]) => (
                  <div key={k}><p className="text-[9px] text-white/20 mb-0.5">{k}</p><p className="text-xs font-black text-white">{v}</p></div>
                ))}
              </div>
            )}
          </div>

          {/* 快捷仓位 */}
          <div className="grid grid-cols-3 gap-2">
            {[['100股', () => setQty(100)], ['50%仓', () => setPercent(0.5)], ['满仓', () => setPercent(1)]].map(([l, fn]) => (
              <button key={l} onClick={fn} className="py-2 bg-white/5 border border-white/8 rounded-xl text-[10px] font-black text-white/50 hover:text-white hover:border-white/20 transition-all">{l}</button>
            ))}
          </div>

          {/* 买卖按钮 */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <button onClick={() => handleMarketTrade('BUY')} disabled={!canTrade || loading}
              className={`h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border-2 flex flex-col items-center justify-center gap-1 ${buySuggested ? 'bg-up/10 border-up/40 text-up' : 'bg-white/5 border-white/5 text-up/50 hover:text-up hover:border-up/20'}`}>
              <TrendingUp size={18} />
              <span>{buySuggested ? '建议买入' : '买入'}</span>
            </button>
            <button onClick={() => handleMarketTrade('SELL')} disabled={!canTrade || loading}
              className={`h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border-2 flex flex-col items-center justify-center gap-1 ${sellSuggested ? 'bg-down/10 border-down/40 text-down' : 'bg-white/5 border-white/5 text-down/50 hover:text-down hover:border-down/20'}`}>
              <TrendingDown size={18} />
              <span>{sellSuggested ? '建议卖出' : '卖出'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 限价单 */}
      {tab === 'limit' && (
        <div className="flex flex-col gap-4 flex-1">
          <p className="text-[11px] text-white/40 leading-relaxed">
            设定目标价格，当市场价触及时自动成交。买单需预冻结资金。
          </p>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">限价（元）</Label>
            <input type="number" step="0.01" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
              className="w-full h-12 bg-black/40 border border-white/5 focus:border-secondary/30 text-xl font-black text-center rounded-2xl outline-none text-white transition-all" />
            {price > 0 && limitPrice && (
              <p className={`text-[10px] text-center ${parseFloat(limitPrice) > price ? 'text-up/60' : parseFloat(limitPrice) < price ? 'text-down/60' : 'text-white/30'}`}>
                {parseFloat(limitPrice) > price ? `↑ 高于现价 +${((parseFloat(limitPrice)/price-1)*100).toFixed(2)}%` :
                 parseFloat(limitPrice) < price ? `↓ 低于现价 ${((parseFloat(limitPrice)/price-1)*100).toFixed(2)}%` : '= 等于现价'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">数量（股）</Label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full h-12 bg-black/40 border border-white/5 focus:border-secondary/30 text-xl font-black text-center rounded-2xl outline-none text-white transition-all" />
          </div>
          {limitPrice && qty && (
            <div className="grid grid-cols-2 gap-2 text-center">
              {[['预估金额', `¥${(parseFloat(limitPrice||0)*parseFloat(qty||0)).toLocaleString(undefined,{maximumFractionDigits:0})}`],
                ['预估手续费', `¥${feeEstimate(parseFloat(limitPrice||0), parseFloat(qty||0))}`]
              ].map(([k,v]) => (
                <div key={k} className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <p className="text-[9px] text-white/20 mb-0.5">{k}</p>
                  <p className="text-xs font-black text-white">{v}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <button onClick={() => handleLimitOrder('buy')} disabled={loading}
              className="h-14 rounded-2xl font-black text-sm bg-up/10 border-2 border-up/30 text-up hover:bg-up/20 transition-all flex items-center justify-center gap-2">
              <TrendingUp size={16} />挂买单
            </button>
            <button onClick={() => handleLimitOrder('sell')} disabled={loading}
              className="h-14 rounded-2xl font-black text-sm bg-down/10 border-2 border-down/30 text-down hover:bg-down/20 transition-all flex items-center justify-center gap-2">
              <TrendingDown size={16} />挂卖单
            </button>
          </div>
        </div>
      )}

      {/* 挂单列表 */}
      {tab === 'orders' && (
        <div className="flex-1 overflow-y-auto">
          <OrderList token={token} refreshKey={orderRefreshKey} />
        </div>
      )}

      {/* 市价单确认弹窗 */}
      {confirmState && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded-[2.5rem]">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-6 w-72 shadow-2xl">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-3">确认市价单</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                ['方向', <span className={`font-black ${confirmState.action === 'BUY' ? 'text-up' : 'text-down'}`}>{confirmState.action === 'BUY' ? '买入' : '卖出'}</span>],
                ['股票', <span className="font-black text-white">{stockName || symbol}</span>],
                ['数量', <span className="font-black text-white">{confirmState.qty} 股</span>],
                ['价格', <span className="font-black text-white">¥{price.toFixed(2)}</span>],
                ['金额', <span className="font-black text-white">¥{confirmState.amount.toLocaleString(undefined,{maximumFractionDigits:0})}</span>],
                ['手续费', <span className="font-black text-white/60">¥{confirmState.fee.toFixed(2)}</span>],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm"><span className="text-white/50">{k}</span>{v}</div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmState(null)} className="py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white transition-all">取消</button>
              <button onClick={executeMarketTrade} className={`py-2 rounded-xl text-xs font-black text-white transition-all ${confirmState.action === 'BUY' ? 'bg-up/20 border border-up/30 hover:bg-up/30' : 'bg-down/20 border border-down/30 hover:bg-down/30'}`}>
                确认{confirmState.action === 'BUY' ? '买入' : '卖出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradePanel;
