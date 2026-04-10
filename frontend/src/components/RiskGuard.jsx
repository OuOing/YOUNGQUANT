import { useMemo } from 'react';

/**
 * useRiskGuard — 风险提示 hook
 * @param {object} portfolio — 账户数据 { total_assets, holdings }
 * @param {number} tradeAmount — 本次交易金额
 * @returns {{ warnings: string[], hasWarning: boolean }}
 */
export function useRiskGuard(portfolio, tradeAmount) {
  return useMemo(() => {
    const warnings = [];
    const totalAssets = portfolio?.total_assets || 0;

    // 集中持仓警告：单笔买入 > 总资产 30%
    if (tradeAmount > 0 && totalAssets > 0 && tradeAmount > totalAssets * 0.3) {
      warnings.push(`本次买入金额（¥${tradeAmount.toLocaleString()}）超过总资产的 30%，存在集中持仓风险。`);
    }

    // 止损提示：持仓浮亏 > 10%
    const holdings = portfolio?.holdings || {};
    for (const [symbol, hold] of Object.entries(holdings)) {
      if (hold.cost > 0 && hold.price > 0) {
        const pnlPct = (hold.price - hold.cost) / hold.cost;
        if (pnlPct < -0.1) {
          warnings.push(`${hold.name || symbol} 浮亏已超过 10%（${(pnlPct * 100).toFixed(1)}%），建议考虑止损。`);
        }
      }
    }

    return { warnings, hasWarning: warnings.length > 0 };
  }, [portfolio, tradeAmount]);
}

/**
 * RiskGuard — 风险提示组件（展示警告列表）
 */
const RiskGuard = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-yellow-400 flex items-start gap-2">
          <span className="mt-0.5 text-[10px] font-black tracking-widest opacity-70">!</span>
          <span>{w}</span>
        </p>
      ))}
      <p className="text-[10px] text-white/30 mt-2">以上内容仅供学习参考，不构成投资建议。</p>
    </div>
  );
};

export default RiskGuard;
