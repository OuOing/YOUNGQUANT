"""
ai/reviewer.py — 交易复盘引擎

提供单笔交易复盘和阶段性综合复盘两个功能，均实现 API 失败降级。
"""
from __future__ import annotations

import json
from typing import Any

try:
    from .config import SYSTEM_PROMPT, MODEL_NAME, TEMPERATURE, MAX_TOKENS
    from .provider import get_client
    _HAS_CLIENT = True
except Exception:
    _HAS_CLIENT = False


# ---------------------------------------------------------------------------
# 降级默认值
# ---------------------------------------------------------------------------

def _default_trade_review(trade: dict) -> dict:
    symbol = trade.get("symbol", "未知")
    action = trade.get("action", "")
    return {
        "entry_timing": f"{symbol} {action}操作，时机评估暂不可用",
        "hold_duration": "持仓时长数据不足",
        "pnl_attribution": "盈亏归因分析暂不可用",
        "score": 3,
        "suggestion": "建议结合 K 线形态和成交量综合判断入场时机，控制仓位风险。",
    }


def _default_summary(period: str) -> dict:
    return {
        "win_rate": 0.0,
        "avg_hold_days": 0.0,
        "max_profit": 0.0,
        "max_loss": 0.0,
        "common_patterns": ["数据不足，无法识别交易模式"],
        "diagnosis": f"{period}复盘数据不足，请完成更多交易后再生成综合报告。",
    }


# ---------------------------------------------------------------------------
# TradeReviewer
# ---------------------------------------------------------------------------

class TradeReviewer:
    """AI 驱动的交易复盘引擎，API 失败时自动降级。"""

    def review_trade(self, trade: dict, klines: list) -> dict:
        """
        单笔交易复盘。

        参数：
        - trade: 交易记录 dict，含 symbol、action、price、shares、fee、date 等字段
        - klines: K 线数据列表（每项含 date、open、high、low、close、volume）

        返回：
        {
            "entry_timing": str,
            "hold_duration": str,
            "pnl_attribution": str,
            "score": int (1-5),
            "suggestion": str (<=100字)
        }
        """
        if not _HAS_CLIENT:
            return _default_trade_review(trade)

        try:
            client = get_client()
            kline_summary = json.dumps(klines[-10:] if len(klines) > 10 else klines,
                                       ensure_ascii=False)
            prompt = f"""请对以下模拟交易进行专业复盘分析，仅返回 JSON，禁止 markdown：

交易记录：{json.dumps(trade, ensure_ascii=False)}
最近K线（最多10根）：{kline_summary}

返回格式：
{{"entry_timing": "入场时机评估(30字内)", "hold_duration": "持仓时长分析(20字内)", "pnl_attribution": "盈亏归因(30字内)", "score": 1到5的整数, "suggestion": "改进建议(100字以内)"}}"""

            resp = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
            )
            text = resp.choices[0].message.content.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            result = json.loads(text.strip())

            # 约束字段
            result["score"] = max(1, min(5, int(result.get("score", 3))))
            suggestion = result.get("suggestion", "")
            if len(suggestion) > 100:
                result["suggestion"] = suggestion[:100]
            for field in ("entry_timing", "hold_duration", "pnl_attribution"):
                if field not in result:
                    result[field] = _default_trade_review(trade)[field]
            return result

        except Exception as e:
            default = _default_trade_review(trade)
            default["suggestion"] = f"复盘分析异常: {str(e)[:80]}"
            return default

    def review_summary(self, trades: list, period: str) -> dict:
        """
        阶段性综合复盘（周报/月报）。

        参数：
        - trades: 该时间段内的交易记录列表
        - period: "week" 或 "month"

        返回：
        {
            "win_rate": float,
            "avg_hold_days": float,
            "max_profit": float,
            "max_loss": float,
            "common_patterns": list[str] (长度 >= 1),
            "diagnosis": str
        }
        """
        if not trades:
            return _default_summary(period)

        # 先用纯统计计算基础指标（不依赖 AI）
        stats = self._calc_stats(trades)

        if not _HAS_CLIENT:
            stats["common_patterns"] = ["追涨杀跌", "过早止盈"] if len(trades) >= 2 else ["交易次数不足"]
            stats["diagnosis"] = f"{period}综合诊断：共 {len(trades)} 笔交易，胜率 {stats['win_rate']:.1%}。"
            return stats

        try:
            client = get_client()
            trades_summary = json.dumps(trades[:20], ensure_ascii=False)
            prompt = f"""请对以下{period}模拟交易记录进行综合诊断，仅返回 JSON，禁止 markdown：

交易记录（最多20条）：{trades_summary}
基础统计：{json.dumps(stats, ensure_ascii=False)}

返回格式：
{{"win_rate": 胜率浮点数, "avg_hold_days": 平均持股天数浮点数, "max_profit": 最大单笔盈利浮点数, "max_loss": 最大单笔亏损浮点数, "common_patterns": ["模式1","模式2","模式3"], "diagnosis": "综合诊断(100字内)"}}"""

            resp = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
            )
            text = resp.choices[0].message.content.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            result = json.loads(text.strip())

            # 确保 common_patterns 非空
            if not result.get("common_patterns"):
                result["common_patterns"] = stats.get("common_patterns", ["无明显模式"])
            return result

        except Exception as e:
            stats["common_patterns"] = ["分析异常，请稍后重试"]
            stats["diagnosis"] = f"综合诊断异常: {str(e)[:80]}"
            return stats

    def _calc_stats(self, trades: list) -> dict:
        """纯统计计算，不依赖 AI。"""
        sell_trades = [t for t in trades if str(t.get("action", "")).lower() == "sell"]
        if not sell_trades:
            return {
                "win_rate": 0.0,
                "avg_hold_days": 0.0,
                "max_profit": 0.0,
                "max_loss": 0.0,
                "common_patterns": ["暂无卖出记录"],
                "diagnosis": "",
            }

        profits = []
        for t in sell_trades:
            try:
                pnl = float(t.get("realized_pnl", 0))
                profits.append(pnl)
            except (TypeError, ValueError):
                pass

        win_count = sum(1 for p in profits if p > 0)
        win_rate = win_count / len(profits) if profits else 0.0
        max_profit = max(profits) if profits else 0.0
        max_loss = min(profits) if profits else 0.0

        return {
            "win_rate": round(win_rate, 4),
            "avg_hold_days": 0.0,
            "max_profit": round(max_profit, 4),
            "max_loss": round(max_loss, 4),
            "common_patterns": ["追涨杀跌"] if win_rate < 0.4 else ["持仓稳健"],
            "diagnosis": "",
        }
