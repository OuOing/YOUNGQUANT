import React, { useState, useCallback } from 'react';
import KnowledgeModule from '../components/KnowledgeModule.jsx';
import KLineReplay from '../components/KLineReplay.jsx';
import DailyLesson from '../components/DailyLesson.jsx';

const TECH_MODULES = [
  { key: 'k_line', label: 'K线' },
  { key: 'ma', label: '均线' },
  { key: 'volume_price', label: '量价关系' },
  { key: 'macd', label: 'MACD' },
  { key: 'kdj', label: 'KDJ' },
];

const FUNDAMENTAL_ITEMS = [
  { title: '市盈率（PE）', desc: '股价 / 每股收益，衡量估值高低。PE < 15 通常被认为低估，> 30 偏高。', tag: '估值' },
  { title: '市净率（PB）', desc: '股价 / 每股净资产，衡量资产价值。银行股 PB < 1 常见，成长股 PB 可达 5+。', tag: '估值' },
  { title: '营收增长率', desc: '反映公司业务扩张能力。连续 3 年 > 20% 增长是优质成长股的重要标志。', tag: '成长' },
  { title: '净利润增速', desc: '判断公司成长性的核心指标。净利润增速 > 营收增速，说明盈利质量在提升。', tag: '成长' },
  { title: 'ROE（净资产收益率）', desc: '衡量公司盈利能力，持续高于 15% 是优质公司标志。巴菲特最看重此指标。', tag: '盈利' },
  { title: '财报解读', desc: '重点看三张表：资产负债表（偿债能力）、利润表（盈利能力）、现金流量表（造血能力）。', tag: '财报' },
];

const TRADING_RULES_ITEMS = [
  { title: 'T+1 规则', desc: '当日买入的股票次日方可卖出，防止日内频繁交易。资金卖出后当日可用。', tag: '核心' },
  { title: '涨跌停限制', desc: '主板 ±10%，科创板/创业板 ±20%，ST 股 ±5%。涨停时无法继续买入（除非有人卖出）。', tag: '规则' },
  { title: '集合竞价', desc: '开盘前（9:15-9:25）和收盘时（14:57-15:00）集中撮合，价格由供需决定，非实时成交。', tag: '机制' },
  { title: '龙虎榜', desc: '成交金额异常时公布前五名营业部买卖数据，可观察主力资金动向。', tag: '信息' },
  { title: '交易时间', desc: '周一至周五 9:30-11:30，13:00-15:00。节假日休市，具体以交易所公告为准。', tag: '时间' },
  { title: '最小交易单位', desc: '买入须为 100 股（1手）的整数倍。卖出可以不足 100 股（零股卖出）。', tag: '规则' },
];

const TAG_COLORS = {
  '估值': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  '成长': 'text-green-400 bg-green-500/10 border-green-500/20',
  '盈利': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  '财报': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  '核心': 'text-red-400 bg-red-500/10 border-red-500/20',
  '规则': 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  '机制': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  '信息': 'text-white/40 bg-white/5 border-white/10',
  '时间': 'text-white/40 bg-white/5 border-white/10',
};

const LearningCenter = ({ token, symbol = '601899', onBack }) => {
  const [mainTab, setMainTab] = useState('tech');
  const [techModule, setTechModule] = useState('k_line');
  const [showReplay, setShowReplay] = useState(false);

  // 标记学习进度
  const markProgress = useCallback((moduleKey, status = 'in_progress') => {
    if (!token) return;
    fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ module: moduleKey, status }),
    }).catch(() => {});
  }, [token]);

  const handleModuleChange = (key) => {
    setTechModule(key);
    markProgress(key, 'in_progress');
  };

  const handleTabChange = (tab) => {
    setMainTab(tab);
    if (tab === 'fundamental') markProgress('fundamental', 'in_progress');
    if (tab === 'rules') markProgress('trading_rules', 'in_progress');
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto min-h-screen bg-bg-deep">
      {/* Header */}
      <div className="flex items-center gap-3 flex-nowrap">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 hover:text-white hover:border-secondary/30 transition-all shrink-0 whitespace-nowrap">
            ← 返回
          </button>
        )}
        <div className="h-4 w-[1px] bg-white/10 shrink-0" />
        <div className="inline-block px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-[9px] font-black text-secondary uppercase tracking-widest shrink-0">LEARN</div>
        <h2 className="text-xl font-black text-white whitespace-nowrap">学习中心</h2>
      </div>

      {/* 今日课堂 */}
      <DailyLesson token={token} />

      {/* 主标签页 */}
      <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 w-fit">
        {[
          { key: 'tech', label: '技术指标' },
          { key: 'fundamental', label: '基本面' },
          { key: 'rules', label: '交易规则' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${mainTab === tab.key ? 'bg-teal-500 text-black' : 'text-white/40 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'tech' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {TECH_MODULES.map(m => (
              <button
                key={m.key}
                onClick={() => handleModuleChange(m.key)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${techModule === m.key ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <KnowledgeModule
            moduleKey={techModule}
            onModuleComplete={(key) => markProgress(key, 'completed')}
          />

          {/* K 线回放 */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-black text-white">K 线历史回放</h4>
                <p className="text-[10px] text-white/30 mt-0.5">用真实历史数据练习识别 K 线形态</p>
              </div>
              <button
                onClick={() => setShowReplay(!showReplay)}
                className="px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black rounded-xl hover:bg-teal-500/20 transition-all"
              >
                {showReplay ? '收起' : '▶ 开始回放'}
              </button>
            </div>
            {showReplay && <KLineReplay symbol={symbol} period="daily" />}
            {!showReplay && (
              <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/30">
                    <rect x="1" y="3" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6"/>
                    <rect x="5.5" y="1" width="3" height="12" rx="0.5" fill="currentColor"/>
                    <rect x="10" y="5" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/50">支持 1x / 2x / 4x 倍速播放，逐帧后退</p>
                  <p className="text-[10px] text-white/25 mt-0.5">点击「开始回放」加载历史 K 线数据</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'fundamental' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/40">基本面分析关注公司的内在价值，是长期投资的核心方法论。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FUNDAMENTAL_ITEMS.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${TAG_COLORS[item.tag] || 'text-white/40 bg-white/5 border-white/10'}`}>{item.tag}</span>
                  <h4 className="text-xs font-black text-white">{item.title}</h4>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === 'rules' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/40">了解 A 股交易规则，避免因规则不熟悉造成不必要的损失。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TRADING_RULES_ITEMS.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${TAG_COLORS[item.tag] || 'text-white/40 bg-white/5 border-white/10'}`}>{item.tag}</span>
                  <h4 className="text-xs font-black text-white">{item.title}</h4>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 mt-2">
            <p className="text-[10px] text-secondary font-black mb-1">本平台模拟盘遵循以上全部规则</p>
            <p className="text-[10px] text-white/40">T+1、涨跌停、手续费均按真实 A 股标准执行，让你在零风险环境中体验真实交易压力。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningCenter;
