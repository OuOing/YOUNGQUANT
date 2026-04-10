import React, { useState } from 'react';
import { 
  X, BookOpen, Cpu, BarChart3, Wallet, 
  RefreshCcw, FlaskConical, ShieldCheck, 
  ChevronRight, Sparkles, Terminal, Activity
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const modules = [
  { 
    id: 'intro', 
    title: '系统概览', 
    subtitle: 'System Overview',
    icon: BookOpen,
    content: {
      title: 'YoungQuant Pro 交易终端',
      description: '欢迎使用新一代量化交易平台。本系统旨在为量化学习者提供 AI 辅助分析与模拟交易功能。',
      points: [
        { label: '混合架构', text: '结合 Go 高性能并发后端与 React 极速渲染前端。' },
        { label: '多端同步', text: '支持 15min/1h/1d 多周期 K 线同步解析。' },
        { label: '合规风控', text: '全链路 E2E 加密，内置多重止盈止损保护机制。' }
      ]
    }
  },
  { 
    id: 'ai', 
    title: 'AI 智能体', 
    subtitle: 'Intelligence / LLM',
    icon: Sparkles,
    content: {
      title: '深度学习信号矩阵',
      description: '基于自研深度学习模型，系统实时扫描市场波动并输出量化信号指标。',
      points: [
        { label: 'BUY / SELL', text: '基于多因子回归算法输出的即时交易指令。' },
        { label: '置信度评分', text: '每条信号均附带 AI 模型对该次预测的强度评分。' },
        { label: '异动捕捉', text: '自动识别并标记异常成交量与价格偏离。' }
      ]
    }
  },
  { 
    id: 'trade', 
    title: '交易执行', 
    subtitle: 'Execution / Orders',
    icon: Terminal,
    content: {
      title: '极简执行台',
      description: '专为快速反应设计，化繁为简，实现毫秒级下单响应。',
      points: [
        { label: '量化滑块', text: '通过百分比滑块快速管理仓位配比（25%/50%/100%）。' },
        { label: '动态报价', text: '与交易所直连，实时刷新最高买价与最低卖价。' },
        { label: '智能报单', text: '自动计算最优成交路径，减少交易滑点影响。' }
      ]
    }
  },
  { 
    id: 'assets', 
    title: '资产动态', 
    subtitle: 'Portfolio Flow',
    icon: Activity,
    content: {
      title: '全景资产监控',
      description: '全天候追踪投资组合健康度，可视化呈现盈亏曲线。',
      points: [
        { label: '实时估值', text: '基于公允价值实时更新当前账户权益总额。' },
        { label: '风险敞口', text: '精准计算单品种对整体头寸的相关性贡献。' },
        { label: '历史流转', text: '结构化展示资金进出记录，便于税务合规审计。' }
      ]
    }
  }
];

const TutorialModal = ({ isOpen, onClose }) => {
  const [activeModule, setActiveModule] = useState(modules[0]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[700px] p-0 bg-[#0a0a0b] border-white/5 shadow-2xl overflow-hidden rounded-[2.5rem]">
        <div className="flex h-full">
          {/* Left Sidebar: Navigation */}
          <div className="w-80 bg-white/[0.02] border-r border-white/5 flex flex-col p-8 bg-gradient-to-b from-white/[0.02] to-transparent">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest text-white/40 uppercase">YoungQuant</p>
                <p className="text-sm font-black text-white tracking-tight">AI 量化平台</p>
              </div>
            </div>

            <nav className="flex-1 space-y-2">
              <p className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase mb-4 ml-2">知识库模块 / Modules</p>
              {modules.map((m) => {
                const Icon = m.icon;
                const isActive = activeModule.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(m)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group relative",
                      isActive ? "bg-white/[0.08] shadow-inner" : "hover:bg-white/[0.04]"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-white rounded-full translate-x-[-2px] shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isActive ? "bg-white text-black" : "bg-white/5 text-white/20 group-hover:text-white/40"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left">
                      <p className={cn(
                        "text-xs font-black tracking-tight",
                        isActive ? "text-white" : "text-white/40"
                      )}>{m.title}</p>
                      <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest leading-none mt-1">{m.subtitle}</p>
                    </div>
                    {isActive && <ChevronRight size={14} className="ml-auto text-white/20" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/5">
                <Sparkles size={14} className="text-white/40" />
                <p className="text-[10px] font-bold text-white/30 tracking-tight leading-tight">
                  当前连接: <span className="text-white/60">YoungQuant V1</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Content: Details */}
          <div className="flex-1 flex flex-col bg-[#0a0a0b] relative">
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10 border border-white/5"
            >
              <X size={18} />
            </button>

            <ScrollArea className="flex-1 p-16 pr-20">
              <div className="max-w-2xl animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Section_Detail</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <h2 className="text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                  {activeModule.content.title}
                </h2>
                
                <p className="text-lg text-white/40 leading-relaxed font-medium mb-12">
                  {activeModule.content.description}
                </p>

                <div className="space-y-6">
                  {activeModule.content.points.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="group flex gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:translate-x-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white group-hover:text-black transition-all">
                        <span className="text-xs font-black">0{idx + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">{p.label}</h4>
                        <p className="text-sm text-white/40 leading-relaxed">{p.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-16 pt-12 border-t border-white/5 flex items-start gap-8">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase mb-3">知识产权声明 / Integrity</p>
                    <p className="text-[11px] text-white/15 leading-relaxed">
                      本报告内容仅供学习参考，量化交易存在市场风险。系统生成的信号不构成投资建议。所有算法模型均由 YoungQuant 实验室独立完成。
                    </p>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-4 bg-white text-black rounded-2xl cursor-pointer hover:bg-zinc-200 transition-all active:scale-95" onClick={onClose}>
                    <BookOpen size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">关闭并开始</span>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Bottom Progress Bar */}
            <div className="h-2 w-full bg-white/5 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-in-out shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                style={{ width: `${((modules.indexOf(activeModule) + 1) / modules.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialModal;
