import React from 'react';
import { Button } from './ui/button';
import { Trophy, Clock, TrendingUp, Hash, ArrowUpRight, ArrowDownRight, Share2, Sparkles } from 'lucide-react';

export default function SessionSummary({ data, onClose }) {
  const isProfit = data.profit >= 0;
  
  const formatDuration = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-fade-in overflow-y-auto">
      <div className="section-card max-w-2xl w-full p-12 relative overflow-hidden group shadow-[0_30px_100px_rgba(0,0,0,0.9)] border-secondary/20">
        {/* Decorative Background Elements */}
        <div className={`absolute -top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-1000 ${isProfit ? 'bg-up' : 'bg-down'}`} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-[2rem] flex items-center justify-center shadow-2xl border-2 transition-all duration-700 ${isProfit ? 'bg-up/10 border-up/30 text-up animate-bounce-subtle' : 'bg-down/10 border-down/30 text-down'}`}>
              <Trophy size={40} />
            </div>
            <div className="ai-tag mx-auto mb-4 tracking-[0.3em]">QUANT SESSION TERMINATED</div>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">本次模拟操盘报告</h2>
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest leading-relaxed">
              SESSION PERFORMANCE ANALYSIS & INSIGHTS
            </p>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center text-center group-hover:bg-white/[0.08] transition-all duration-500">
              <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">
                <TrendingUp size={12} className="text-secondary" />
                Total Return
              </div>
              <div className={`text-4xl font-black font-brand tracking-tighter flex items-center gap-3 ${isProfit ? 'text-up' : 'text-down'}`}>
                {isProfit ? <ArrowUpRight size={32} /> : <ArrowDownRight size={32} />}
                ¥{Math.abs(data.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-sm font-black mt-2 italic px-3 py-1 rounded-lg ${isProfit ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                {isProfit ? '+' : ''}{data.profitPct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center text-center group-hover:bg-white/[0.08] transition-all duration-500">
              <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">
                <Clock size={12} className="text-secondary" />
                Session Duration
              </div>
              <div className="text-4xl font-black text-white font-brand tracking-tighter">
                {formatDuration(data.duration)}
              </div>
              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-2">Active Trading Time</div>
            </div>
          </div>

          {/* Secondary Details */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="flex justify-between items-center px-8 py-5 bg-white/5 border border-white/5 rounded-3xl">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                    <Hash size={18} />
                  </div>
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">Trade Count</span>
               </div>
               <span className="text-xl font-black text-white italic">{data.trades}次</span>
            </div>
            <div className="flex justify-between items-center px-8 py-5 bg-white/5 border border-white/5 rounded-3xl">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">Starting Cap.</span>
               </div>
               <span className="text-xl font-black text-white/80">¥{data.startCapital.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button 
              onClick={onClose}
              className="flex-1 py-10 rounded-[2.5rem] bg-white text-black text-xl font-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
            >
              确 认 并 返 回
            </Button>
            <Button 
              variant="outline"
              className="aspect-square h-auto py-10 rounded-[2.5rem] border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all shadow-xl"
            >
              <Share2 size={24} />
            </Button>
          </div>
          
          <p className="mt-8 text-center text-[9px] font-black text-white/10 uppercase tracking-[0.5em] italic">
            Institutional Performance Review • YoungQuant Pro v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
