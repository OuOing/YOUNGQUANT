import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const TradePanel = ({
  symbol,
  price,
  cash,
  stockName,
  suggestedSignal,
  availability,
  availabilityLoading,
  onTradeSuccess
}) => {
  const [qty, setQty] = useState(100);
  const [loading, setLoading] = useState(false);

  const buySuggested = suggestedSignal === 'BUY';
  const sellSuggested = suggestedSignal === 'SELL';

  const maxBuy = price > 0 ? Math.floor(cash / (price * 1.0003) / 100) * 100 : 0;
  const canTrade = useMemo(() => {
    if (availabilityLoading) return false;
    if (!availability) return price > 0;
    return availability.has_features && price > 0;
  }, [availabilityLoading, availability, price]);

  const handleTrade = async (action) => {
    setLoading(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, action, price, qty: parseFloat(qty) })
      });
      const data = await res.json();
      if (data.status === 'success') {
        onTradeSuccess(`[成交] ${action === 'BUY' ? '买入' : '卖出'} ${stockName || symbol} ${qty} 股`);
      } else {
        alert("信号源限制: " + data.msg);
      }
    } catch (e) {
      console.error("Trade failed", e);
    } finally {
      setLoading(false);
    }
  };

  const setPercent = (pct) => {
    if (price <= 0) return;
    const targetQty = Math.floor((cash * pct) / (price * 1.0003) / 100) * 100;
    setQty(targetQty > 0 ? targetQty : 100);
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-between items-center text-base text-text-dim px-2 font-bold uppercase tracking-wider">
        <span>当前标的: <b className="text-white">{stockName || symbol}</b></span>
        <span>最大可买: <b className="text-white">{maxBuy} 股</b></span>
      </div>

      {availabilityLoading ? (
        <div className="text-xs text-text-dim font-black uppercase tracking-widest -mt-3">
          数据校验中...
        </div>
      ) : availability && !availability.has_features ? (
        <div className="text-xs text-down/90 font-black uppercase tracking-widest -mt-3">
          当前周期缺少特征文件：点击「重训流水线」生成
        </div>
      ) : price <= 0 ? (
        <div className="text-xs text-text-dim font-black uppercase tracking-widest -mt-3">
          当前价格不可用，请稍后重试
        </div>
      ) : null}

      <div className="relative my-4">
        <input 
          type="number" 
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full bg-black/60 border-2 border-white/10 rounded-[2rem] p-5 text-3xl font-black text-center outline-none focus:border-[#00f2ea]/40 transition-all font-brand text-white shadow-2xl selection:bg-[#00f2ea]/20"
        />
        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
          <DollarSign size={32} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <button onClick={() => setQty(100)} className="btn-pro btn-pro-glass py-7 rounded-[2rem] text-lg font-black whitespace-nowrap">100股</button>
        <button onClick={() => setPercent(0.5)} className="btn-pro btn-pro-glass py-7 rounded-[2rem] text-lg font-black whitespace-nowrap">半仓</button>
        <button onClick={() => setPercent(1.0)} className="btn-pro btn-pro-glass py-7 rounded-[2rem] text-lg font-black whitespace-nowrap">满仓</button>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-10">
        <button 
          onClick={() => handleTrade('BUY')}
          disabled={!canTrade || loading}
          className={`btn-pro bg-up border-transparent py-10 rounded-[2.5rem] font-black text-2xl text-white shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-6 uppercase tracking-[0.2em] ${
            buySuggested ? 'ring-2 ring-up/40' : 'opacity-90'
          }`}
        >
          <TrendingUp size={36} /> {buySuggested ? '建议买入' : '买入指令'}
        </button>
        <button 
          onClick={() => handleTrade('SELL')}
          disabled={!canTrade || loading}
          className={`btn-pro bg-down border-transparent py-10 rounded-[2.5rem] font-black text-2xl text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-6 uppercase tracking-[0.2em] ${
            sellSuggested ? 'ring-2 ring-down/40' : 'opacity-90'
          }`}
        >
          <TrendingDown size={36} /> {sellSuggested ? '卖出指令' : '卖出指令'}
        </button>
      </div>
    </div>
  );
};

export default TradePanel;
