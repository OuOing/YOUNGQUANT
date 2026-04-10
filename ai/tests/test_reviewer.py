"""
Tests for ai/reviewer.py

属性 12：复盘报告结构完整性（含三维度字段，score ∈ [1,5]，suggestion <= 100字）
属性 13：综合复盘报告字段完整性（含五项指标，common_patterns 长度 >= 1）

验证：需求 7.1、7.2、7.3、7.4
"""
import os
import sys

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.reviewer import TradeReviewer, _default_trade_review, _default_summary


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_trade(**kwargs) -> dict:
    base = {
        "symbol": "601899",
        "name": "紫金矿业",
        "action": "sell",
        "price": 15.0,
        "shares": 100,
        "fee": 0.45,
        "date": "2024-03-01",
        "realized_pnl": 50.0,
    }
    base.update(kwargs)
    return base


def _make_klines(n: int = 10) -> list:
    return [
        {"date": f"2024-02-{i+1:02d}", "open": 14.0, "high": 15.5,
         "low": 13.5, "close": 14.5 + i * 0.1, "volume": 100000}
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# 属性测试 11.5 — 属性 12：复盘报告结构完整性
# Feature: youngquant-platform-enhancement, Property 12
# **Validates: Requirements 7.1, 7.2**
# ---------------------------------------------------------------------------

@given(
    symbol=st.text(min_size=1, max_size=10),
    action=st.sampled_from(["buy", "sell"]),
    price=st.floats(min_value=1.0, max_value=1000.0, allow_nan=False),
    shares=st.integers(min_value=1, max_value=10000),
    pnl=st.floats(min_value=-10000.0, max_value=10000.0, allow_nan=False),
    n_klines=st.integers(min_value=0, max_value=30),
)
@settings(max_examples=100)
def test_review_trade_structure(symbol, action, price, shares, pnl, n_klines):
    """
    属性 12：复盘报告结构完整性
    - 包含 entry_timing、hold_duration、pnl_attribution 三个维度字段
    - score ∈ [1, 5]
    - suggestion 长度 <= 100 字
    """
    trade = _make_trade(symbol=symbol, action=action, price=price,
                        shares=shares, realized_pnl=pnl)
    klines = _make_klines(n_klines)

    reviewer = TradeReviewer()
    result = reviewer.review_trade(trade, klines)

    # 三维度字段必须存在
    for field in ("entry_timing", "hold_duration", "pnl_attribution"):
        assert field in result, f"缺少字段 {field}"
        assert isinstance(result[field], str), f"{field} 应为字符串"

    # score ∈ [1, 5]
    score = result.get("score")
    assert isinstance(score, int), f"score 应为整数，得到 {type(score)}"
    assert 1 <= score <= 5, f"score={score} 不在 [1,5] 范围内"

    # suggestion <= 100 字
    suggestion = result.get("suggestion", "")
    assert isinstance(suggestion, str), "suggestion 应为字符串"
    assert len(suggestion) <= 100, f"suggestion 长度 {len(suggestion)} 超过 100 字: {suggestion!r}"


# ---------------------------------------------------------------------------
# 属性测试 11.6 — 属性 13：综合复盘报告字段完整性
# Feature: youngquant-platform-enhancement, Property 13
# **Validates: Requirements 7.3, 7.4**
# ---------------------------------------------------------------------------

@given(
    n_trades=st.integers(min_value=0, max_value=20),
    period=st.sampled_from(["week", "month"]),
)
@settings(max_examples=100)
def test_review_summary_structure(n_trades, period):
    """
    属性 13：综合复盘报告字段完整性
    - 包含 win_rate、avg_hold_days、max_profit、max_loss、common_patterns 五项指标
    - common_patterns 长度 >= 1
    """
    trades = [
        _make_trade(
            realized_pnl=50.0 if i % 2 == 0 else -30.0,
            date=f"2024-03-{(i % 28) + 1:02d}",
        )
        for i in range(n_trades)
    ]

    reviewer = TradeReviewer()
    result = reviewer.review_summary(trades, period)

    # 五项指标必须存在
    for field in ("win_rate", "avg_hold_days", "max_profit", "max_loss", "common_patterns"):
        assert field in result, f"缺少字段 {field}"

    # 数值字段类型
    assert isinstance(result["win_rate"], (int, float)), "win_rate 应为数值"
    assert isinstance(result["avg_hold_days"], (int, float)), "avg_hold_days 应为数值"
    assert isinstance(result["max_profit"], (int, float)), "max_profit 应为数值"
    assert isinstance(result["max_loss"], (int, float)), "max_loss 应为数值"

    # common_patterns 长度 >= 1
    patterns = result["common_patterns"]
    assert isinstance(patterns, list), "common_patterns 应为列表"
    assert len(patterns) >= 1, f"common_patterns 长度 {len(patterns)} < 1"


# ---------------------------------------------------------------------------
# 额外边界条件测试
# ---------------------------------------------------------------------------

def test_review_trade_default_fallback():
    """降级时返回合法结构"""
    result = _default_trade_review({"symbol": "000001", "action": "buy"})
    assert 1 <= result["score"] <= 5
    assert len(result["suggestion"]) <= 100
    for f in ("entry_timing", "hold_duration", "pnl_attribution"):
        assert f in result


def test_review_summary_empty_trades():
    """空交易列表时返回合法结构"""
    reviewer = TradeReviewer()
    result = reviewer.review_summary([], "week")
    assert len(result["common_patterns"]) >= 1
    assert result["win_rate"] == 0.0


def test_review_summary_default_fallback():
    """降级时返回合法结构"""
    result = _default_summary("month")
    assert len(result["common_patterns"]) >= 1
    assert "diagnosis" in result
