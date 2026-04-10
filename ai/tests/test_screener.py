"""
Tests for ai/screener.py — pandas-free version

属性 1：选股结果完整性（列表长度 <= 10，reason <= 50字，risk_level ∈ {低,中,高}）
属性 4：选股数据不足排除（K 线 < 20 时排除）

验证：需求 4.1、4.3、4.4
"""
import os
import sys
import csv
import tempfile

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.screener import StockScreener, STOCK_NAMES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feature_csv(path: str, num_rows: int) -> None:
    """Write a minimal features CSV with `num_rows` data rows (no pandas needed)."""
    headers = [
        "日期", "股票代码", "开盘", "收盘", "最高", "最低",
        "成交量", "成交额", "振幅", "涨跌幅", "涨跌额", "换手率",
        "date_only", "铜价", "收益率", "铜价涨幅",
        "MA5", "MA20", "MA5_Ratio", "MA20_Ratio",
        "RSI14", "MACD_Line", "MACD_Signal", "MACD_Hist",
        "BB_Mid", "BB_Std", "BB_Upper", "BB_Lower",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for i in range(num_rows):
            ma5 = 10.0 + i * 0.1
            ma20 = 10.0 + i * 0.05
            rsi = 50.0
            vol = 100000 + i * 1000
            writer.writerow([
                f"2024-01-{(i % 28) + 1:02d}", "601899",
                10.0, 10.0 + i * 0.1, 10.5, 9.5,
                vol, vol * 10.0, 5.0, 1.0, 0.1, 1.0,
                f"2024-01-{(i % 28) + 1:02d}", 0, 0.01, 0,
                ma5, ma20, 0.01, 0.01,
                rsi, 0.1, 0.05, 0.05,
                10.0, 0.5, 11.0, 9.0,
            ])


# ---------------------------------------------------------------------------
# 属性测试 10.5 — 属性 1：选股结果完整性
# Feature: youngquant-platform-enhancement, Property 1
# **Validates: Requirements 4.1、4.3**
# ---------------------------------------------------------------------------

@given(
    st.lists(
        st.sampled_from(["trend", "capital", "sector", "technical"]),
        min_size=1,
        max_size=4,
        unique=True,
    )
)
@settings(max_examples=50)
def test_screener_result_completeness(dimensions):
    """
    属性 1：选股结果完整性
    - 列表长度 <= 10
    - 每只股票的 reason 字段长度 <= 50 字
    - risk_level ∈ {低, 中, 高}
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        for symbol in STOCK_NAMES:
            path = os.path.join(tmpdir, f"features_{symbol}_v3.csv")
            _make_feature_csv(path, num_rows=25)

        screener = StockScreener(data_dir=tmpdir)
        results = screener.screen(dimensions)

    assert len(results) <= 10, f"结果数量 {len(results)} 超过 10"

    valid_risk_levels = {"低", "中", "高"}
    for stock in results:
        reason = stock.get("reason", "")
        assert len(reason) <= 50, (
            f"{stock['symbol']} reason 长度 {len(reason)} 超过 50 字: {reason!r}"
        )
        assert stock.get("risk_level") in valid_risk_levels, (
            f"{stock['symbol']} risk_level={stock.get('risk_level')!r} 不合法"
        )
        for field in ("symbol", "name", "reason", "risk_level", "trend_score", "capital_score"):
            assert field in stock, f"缺少字段 {field}"


# ---------------------------------------------------------------------------
# 边界条件测试 10.6 — 属性 4：数据不足排除
# Feature: youngquant-platform-enhancement, Property 4
# **Validates: Requirements 4.4**
# ---------------------------------------------------------------------------

def test_screener_excludes_insufficient_data():
    """属性 4：K 线 < 20 时排除"""
    with tempfile.TemporaryDirectory() as tmpdir:
        for symbol in STOCK_NAMES:
            path = os.path.join(tmpdir, f"features_{symbol}_v3.csv")
            _make_feature_csv(path, num_rows=5)

        screener = StockScreener(data_dir=tmpdir)
        results = screener.screen(["trend", "capital", "sector", "technical"])

    assert results == [], (
        f"预期空列表，但得到 {len(results)} 只股票: {[s['symbol'] for s in results]}"
    )


def test_screener_includes_sufficient_data():
    """K 线 >= 20 时应出现在结果中"""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_feature_csv(path, num_rows=25)

        screener = StockScreener(data_dir=tmpdir)
        results = screener.screen(["trend", "capital", "sector", "technical"])

    symbols = [s["symbol"] for s in results]
    assert "601899" in symbols


def test_screener_missing_files_returns_empty():
    """无特征文件时返回空列表，不抛异常"""
    with tempfile.TemporaryDirectory() as tmpdir:
        screener = StockScreener(data_dir=tmpdir)
        results = screener.screen(["trend", "capital"])
    assert results == []


def test_screener_result_fields():
    """返回字段结构正确"""
    with tempfile.TemporaryDirectory() as tmpdir:
        for symbol in STOCK_NAMES:
            path = os.path.join(tmpdir, f"features_{symbol}_v3.csv")
            _make_feature_csv(path, num_rows=25)

        screener = StockScreener(data_dir=tmpdir)
        results = screener.screen(["trend", "capital", "sector", "technical"])

    assert len(results) > 0
    for stock in results:
        assert isinstance(stock["symbol"], str)
        assert isinstance(stock["name"], str)
        assert isinstance(stock["reason"], str)
        assert stock["risk_level"] in {"低", "中", "高"}
        assert isinstance(stock["trend_score"], float)
        assert isinstance(stock["capital_score"], float)
        assert len(stock["reason"]) <= 50
