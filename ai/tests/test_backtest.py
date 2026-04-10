"""
Tests for backtest.py run_backtest()

属性 5：回测报告字段完整性（含五项指标和 curve）
属性 6：回测结果 JSON 序列化 Round-Trip（数值误差 < 1e-9）
属性 7：回测数据不足时返回错误（有效交易日 < 30）

验证：需求 5.2、5.4、5.5、19.4
"""
import os
import sys
import csv
import json
import math
import tempfile

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backtest import run_backtest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_backtest_csv(path: str, num_rows: int) -> None:
    """生成最小化的日线特征 CSV（纯 Python，无 pandas）。"""
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
        base_price = 10.0
        for i in range(num_rows):
            # 制造 MA5 金叉死叉信号
            ma5 = base_price + (0.1 if i % 10 < 5 else -0.1)
            ma20 = base_price
            macd = 0.05 if i % 8 < 4 else -0.05
            close = base_price + (i % 5) * 0.1
            writer.writerow([
                f"2024-{(i // 28) + 1:02d}-{(i % 28) + 1:02d}", "601899",
                close - 0.1, close, close + 0.2, close - 0.2,
                100000, 1000000, 2.0, 1.0, 0.1, 1.0,
                f"2024-{(i // 28) + 1:02d}-{(i % 28) + 1:02d}",
                0, 0.01, 0,
                ma5, ma20, 0.01, 0.01,
                50.0, macd, macd * 0.5, macd,
                close, 0.5, close + 1, close - 1,
            ])


# ---------------------------------------------------------------------------
# 属性测试 13.4 — 属性 5：回测报告字段完整性
# Feature: youngquant-platform-enhancement, Property 5
# **Validates: Requirements 5.2**
# ---------------------------------------------------------------------------

@given(
    strategy=st.sampled_from(["ma_cross", "macd_zero"]),
    stop_loss=st.floats(min_value=0.01, max_value=0.20, allow_nan=False),
    take_profit=st.floats(min_value=0.01, max_value=0.50, allow_nan=False),
)
@settings(max_examples=50)
def test_backtest_report_completeness(strategy, stop_loss, take_profit):
    """
    属性 5：回测报告字段完整性
    - 包含 annual_return、max_drawdown、win_rate、sharpe（五项指标）
    - 包含 curve（含 strategy 和 hold 净值）
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_backtest_csv(path, num_rows=60)

        params = {"stop_loss": stop_loss, "take_profit": take_profit}
        report = run_backtest("601899", strategy, params,
                              "2024-01-01", "2024-12-31", data_dir=tmpdir)

    # 五项指标
    metrics = report.get("metrics", {})
    for field in ("annual_return", "max_drawdown", "win_rate", "sharpe", "total_trades"):
        assert field in metrics, f"metrics 缺少字段 {field}"
        assert isinstance(metrics[field], (int, float)), f"{field} 应为数值"

    # curve 存在且包含 strategy 和 hold
    curve = report.get("curve", [])
    assert len(curve) > 0, "curve 不应为空"
    for point in curve:
        assert "date" in point, "curve 每项应含 date"
        assert "strategy" in point, "curve 每项应含 strategy"
        assert "hold" in point, "curve 每项应含 hold"

    # signals 存在
    assert "signals" in report


# ---------------------------------------------------------------------------
# 属性测试 13.5 — 属性 6：回测结果 JSON Round-Trip
# Feature: youngquant-platform-enhancement, Property 6
# **Validates: Requirements 19.4**
# ---------------------------------------------------------------------------

@given(
    strategy=st.sampled_from(["ma_cross", "macd_zero"]),
)
@settings(max_examples=30)
def test_backtest_json_roundtrip(strategy):
    """
    属性 6：回测结果 JSON 序列化 Round-Trip
    序列化后再反序列化，数值误差 < 1e-9
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_backtest_csv(path, num_rows=60)

        report = run_backtest("601899", strategy, {"stop_loss": 0.05, "take_profit": 0.10},
                              "2024-01-01", "2024-12-31", data_dir=tmpdir)

    serialized = json.dumps(report, ensure_ascii=False)
    deserialized = json.loads(serialized)

    # 比较 metrics 数值字段
    orig_metrics = report["metrics"]
    deser_metrics = deserialized["metrics"]
    for field in ("annual_return", "max_drawdown", "win_rate", "sharpe"):
        orig_val = orig_metrics[field]
        deser_val = deser_metrics[field]
        assert abs(orig_val - deser_val) < 1e-9, (
            f"{field}: orig={orig_val}, deser={deser_val}, diff={abs(orig_val - deser_val)}"
        )

    # 比较 curve 数值
    for i, (orig_pt, deser_pt) in enumerate(zip(report["curve"], deserialized["curve"])):
        for key in ("strategy", "hold"):
            assert abs(orig_pt[key] - deser_pt[key]) < 1e-9, (
                f"curve[{i}].{key}: orig={orig_pt[key]}, deser={deser_pt[key]}"
            )


# ---------------------------------------------------------------------------
# 边界条件测试 13.6 — 属性 7：回测数据不足时返回错误
# Feature: youngquant-platform-enhancement, Property 7
# **Validates: Requirements 5.4, 5.5**
# ---------------------------------------------------------------------------

def test_backtest_insufficient_data_raises():
    """属性 7：有效交易日 < 30 时应抛出 ValueError"""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_backtest_csv(path, num_rows=10)  # 只有 10 行，< 30

        with pytest.raises(ValueError, match="有效交易日不足"):
            run_backtest("601899", "ma_cross", {},
                         "2024-01-01", "2024-12-31", data_dir=tmpdir)


def test_backtest_exactly_30_days_ok():
    """恰好 30 个交易日时不应抛出异常"""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_backtest_csv(path, num_rows=30)

        report = run_backtest("601899", "ma_cross", {},
                              "2024-01-01", "2024-12-31", data_dir=tmpdir)
        assert "metrics" in report


def test_backtest_missing_file_raises():
    """文件不存在时应抛出 ValueError（数据不足）"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with pytest.raises(ValueError, match="有效交易日不足"):
            run_backtest("999999", "ma_cross", {},
                         "2024-01-01", "2024-12-31", data_dir=tmpdir)


def test_backtest_invalid_strategy_raises():
    """不支持的策略应抛出 ValueError"""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "features_601899_v3.csv")
        _make_backtest_csv(path, num_rows=60)

        with pytest.raises(ValueError, match="不支持的策略"):
            run_backtest("601899", "unknown_strategy", {},
                         "2024-01-01", "2024-12-31", data_dir=tmpdir)
