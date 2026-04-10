import React, { useState, useEffect } from 'react';
import WatchList from '../components/WatchList.jsx';
import NoteEditor from '../components/NoteEditor.jsx';

const CASH_OPTIONS = [
  { value: 10000,   label: '1 万',   desc: '稍有挑战' },
  { value: 100000,  label: '10 万',  desc: '入门推荐' },
  { value: 500000,  label: '50 万',  desc: '进阶' },
  { value: 1000000, label: '100 万', desc: '挑战' },
];

const LEARNING_MODULES = [
  { key: 'k_line', label: 'K线基础' },
  { key: 'ma', label: '均线系统' },
  { key: 'volume_price', label: '量价关系' },
  { key: 'macd', label: 'MACD指标' },
  { key: 'kdj', label: 'KDJ指标' },
  { key: 'fundamental', label: '基本面分析' },
  { key: 'trading_rules', label: '交易规则' },
];

const PersonalCenter = ({ token, portfolio, onSelectStock, onBack, onNavigate }) => {
  const [tab, setTab] = useState('watchlist');
  const [chatHistory, setChatHistory] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [me, setMe] = useState(null);
  const [cashSaving, setCashSaving] = useState(false);
  const [cashSaved, setCashSaved] = useState(false);
  const [learningProgress, setLearningProgress] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    fetch('/api/me', { headers }).then(r => r.json()).then(setMe).catch(() => {});
    fetch('/api/learning/progress', { headers })
      .then(r => r.json())
      .then(data => setLearningProgress(data.progress || []))
      .catch(() => {});
  }, [token]);

  const canSetCash = portfolio && portfolio.total_assets === portfolio.initial_cash;

  const handleSetCash = async (val) => {
    if (!canSetCash) return;
    setCashSaving(true);
    try {
      await fetch('/api/me/initial-cash', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_cash: val }),
      });
      setCashSaved(true);
      setTimeout(() => setCashSaved(false), 2000);
    } catch {}
    setCashSaving(false);
  };

  useEffect(() => {
    if (tab !== 'history' || !token) return;
    const url = `/api/chat-history${dateFilter ? `?date=${dateFilter}` : ''}`;
    fetch(url, { headers }).then(r => r.json()).then(data => setChatHistory(data.history || [])).catch(() => {});
  }, [tab, dateFilter, token]);

  if (!token) return <div className="p-8 text-center text-white/40">请先登录</div>;

  const totalPnlPct = portfolio?.total_pnl_pct || 0;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto min-h-screen bg-bg-deep">
      <div className="flex items-center gap-3 flex-nowrap">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 hover:text-white hover:border-secondary/30 transition-all shrink-0 whitespace-nowrap">
            ← 返回
          </button>
        )}
        <h2 className="text-xl font-black text-white whitespace-nowrap">个人中心</h2>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总资产', value: `¥${(portfolio?.total_assets || 0).toLocaleString()}` },
          { label: '累计收益率', value: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`, color: totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: '注册时间', value: me?.created_at?.slice(0, 10) || '-' },
          { label: '学习进度', value: `${Math.round((me?.learning_pct || 0) * 100)}%` },
        ].map(item => (
          <div key={item.label} className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
            <p className="text-[9px] text-white/30 uppercase mb-1">{item.label}</p>
            <p className={`text-sm font-black ${item.color || 'text-white'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 模拟本金设置 */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-black text-white">模拟本金</p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {canSetCash ? '尚未交易，可修改本金档位' : '已有交易记录，本金不可更改'}
            </p>
          </div>
          <p className="text-sm font-black text-secondary">¥{(portfolio?.initial_cash || 100000).toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CASH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              disabled={!canSetCash || cashSaving}
              onClick={() => handleSetCash(opt.value)}
              className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs transition-all ${
                portfolio?.initial_cash === opt.value
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : canSetCash
                    ? 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                    : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <span className="font-black">{opt.label}</span>
              <span className="text-[9px] opacity-60 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
        {cashSaved && <p className="text-[10px] text-secondary mt-2">已保存</p>}
      </div>

      {/* 标签页 */}
      <div className="flex flex-wrap gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 w-fit">
        {[
          { key: 'watchlist', label: '自选股' },
          { key: 'notes', label: '笔记' },
          { key: 'history', label: '对话历史' },
          { key: 'progress', label: '学习进度' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${tab === t.key ? 'bg-teal-500 text-black' : 'text-white/40 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
        {tab === 'watchlist' && <WatchList token={token} onSelectStock={onSelectStock} />}
        {tab === 'notes' && <NoteEditor token={token} symbol="" />}

        {tab === 'history' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-white/30 hover:text-white">清除</button>}
            </div>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {chatHistory.length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">暂无对话记录，去和 AI 聊聊吧</p>
              )}
              {chatHistory.map(item => (
                <div key={item.id} className={`p-3 rounded-xl text-xs ${item.role === 'user' ? 'bg-teal-500/10 border border-teal-500/20 text-teal-300' : 'bg-white/5 border border-white/5 text-white/60'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-[10px] uppercase">{item.role === 'user' ? '我' : 'AI'}</span>
                    {item.symbol && <span className="text-[10px] text-white/20">{item.symbol}</span>}
                    <span className="text-[10px] text-white/20 ml-auto">{item.created_at?.slice(0, 16)}</span>
                  </div>
                  <p className="leading-relaxed line-clamp-3">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'progress' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-black text-white">学习进度</p>
              <button
                onClick={() => onNavigate?.('learning')}
                className="text-[10px] text-secondary hover:underline"
              >
                去学习 →
              </button>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/40">总完成度</span>
                <span className="text-sm font-black text-secondary">
                  {Math.round((me?.learning_pct || 0) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-700"
                  style={{ width: `${(me?.learning_pct || 0) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {LEARNING_MODULES.map(mod => {
                const prog = learningProgress.find(p => p.module === mod.key);
                const status = prog?.status || 'not_started';
                const statusConfig = {
                  completed: { label: '已完成', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
                  in_progress: { label: '进行中', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
                  not_started: { label: '未开始', color: 'text-white/20', bg: 'bg-white/5 border-white/5' },
                };
                const cfg = statusConfig[status];
                return (
                  <div key={mod.key} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cfg.bg}`}>
                    <span className="text-xs text-white/70">{mod.label}</span>
                    <span className={`text-[10px] font-black ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
            {learningProgress.length === 0 && (
              <p className="text-[10px] text-white/30 text-center py-2">
                前往学习中心开始你的第一课
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalCenter;
