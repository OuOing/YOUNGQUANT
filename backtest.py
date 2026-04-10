try:
    import pandas as pd
    import numpy as np
    import joblib
    _HAS_DEPS = True
except ImportError:
    _HAS_DEPS = False

import argparse
import os

def backtest(symbol, period="daily"):
    """
    向量化回测：模拟根据模型信号进行交易
    """
    if not _HAS_DEPS:
        print("缺少依赖（pandas/numpy/joblib），跳过向量化回测")
        return
    feature_file = os.path.join("data", f"features_{symbol}_v3.csv")
    if period != "daily":
        feature_file = os.path.join("data", f"features_{symbol}_{period}m_v3.csv")
        
    if not os.path.exists(feature_file):
        print(f"找不到特征文件: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df = df.sort_values('日期')

    # 加载模型
    model_name = os.path.join("data", f"model_{symbol}.pkl")
    if period != "daily":
        model_name = os.path.join("data", f"model_{symbol}_{period}m.pkl")
        
    if not os.path.exists(model_name):
        print("模型不存在，请先训练。")
        return
        
    model = joblib.load(model_name)

    # 准备特征
    features_cols = ['MA5_Ratio', 'MA20_Ratio', 'RSI14', 'MACD_Hist', '铜价涨幅', '收益率']
    df['pred'] = model.predict(df[features_cols])

    # 回测逻辑: 
    # 如果预测值为1 (BUY)，则在下一周期持有
    # A股规则限制: 当日买入次日卖出 (T+1)。
    # 这里简化处理：1表示持有，0表示不持有。
    # 策略收益 = pred * 下一周期涨跌幅
    df['strategy_ret'] = df['收益率'].shift(-1) * df['pred']
    
    # 累计收益
    df['strategy_cum'] = (1 + df['strategy_ret'].fillna(0)).cumprod()
    df['hold_cum'] = (1 + df['收益率'].fillna(0)).cumprod()

    # 保存结果
    res_file = os.path.join("data", f"backtest_results_{symbol}.csv")
    if period != "daily":
        res_file = os.path.join("data", f"backtest_results_{symbol}_{period}m.csv")
        
    df[['日期', '收盘', 'pred', 'strategy_cum', 'hold_cum']].to_csv(res_file, index=False)
    print(f"[{period}] 回测完成。结果已保存到 {res_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899")
    parser.add_argument("--period", type=str, default="daily")
    args = parser.parse_args()
    
    backtest(args.symbol, args.period)


# ---------------------------------------------------------------------------
# run_backtest — 新增自定义回测函数（纯 Python 实现，不依赖 pandas/numpy）
# ---------------------------------------------------------------------------

import csv
import json
import math
from datetime import datetime, timedelta


def _load_daily_csv(symbol: str, data_dir: str = "data") -> list:
    """加载日线特征 CSV，返回 list[dict]，按日期升序排列。"""
    path = os.path.join(data_dir, f"features_{symbol}_v3.csv")
    if not os.path.exists(path):
        return []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        # 过滤有效交易日（有收盘价）
        valid = []
        for r in rows:
            try:
                float(r.get("收盘", "") or r.get("close", ""))
                valid.append(r)
            except (ValueError, TypeError):
                pass
        return valid
    except Exception:
        return []


def _filter_by_date(rows: list, start_date: str, end_date: str) -> list:
    """按日期范围过滤，日期字段为 '日期' 或 'date_only'。"""
    result = []
    for r in rows:
        d = r.get("日期", r.get("date_only", ""))[:10]
        if start_date <= d <= end_date:
            result.append(r)
    return result


def _get_close(row: dict) -> float:
    for col in ("收盘", "close", "Close"):
        v = row.get(col)
        if v is not None and v != "":
            try:
                return float(v)
            except (ValueError, TypeError):
                pass
    return 0.0


def _get_ma(row: dict, key: str) -> float:
    v = row.get(key)
    if v is not None and v != "":
        try:
            return float(v)
        except (ValueError, TypeError):
            pass
    return 0.0


def _get_macd_hist(row: dict) -> float:
    for col in ("MACD_Hist", "macd_hist"):
        v = row.get(col)
        if v is not None and v != "":
            try:
                return float(v)
            except (ValueError, TypeError):
                pass
    return 0.0


def _calc_annual_return(curve: list) -> float:
    if len(curve) < 2:
        return 0.0
    start_val = curve[0]["strategy"]
    end_val = curve[-1]["strategy"]
    n_days = len(curve)
    if start_val <= 0 or n_days == 0:
        return 0.0
    total_return = end_val / start_val - 1
    annual = (1 + total_return) ** (252 / n_days) - 1
    return round(annual, 6)


def _calc_max_drawdown(curve: list) -> float:
    peak = 0.0
    mdd = 0.0
    for point in curve:
        v = point["strategy"]
        if v > peak:
            peak = v
        if peak > 0:
            dd = (peak - v) / peak
            if dd > mdd:
                mdd = dd
    return round(mdd, 6)


def _calc_win_rate(signals: list) -> float:
    if not signals:
        return 0.0
    wins = sum(1 for s in signals if s.get("pnl", 0) > 0)
    return round(wins / len(signals), 4)


def _calc_sharpe(curve: list) -> float:
    if len(curve) < 2:
        return 0.0
    returns = []
    for i in range(1, len(curve)):
        prev = curve[i - 1]["strategy"]
        curr = curve[i]["strategy"]
        if prev > 0:
            returns.append((curr - prev) / prev)
    if not returns:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / len(returns)
    std = math.sqrt(variance)
    if std == 0:
        return 0.0
    return round(mean / std * math.sqrt(252), 4)


def run_backtest(symbol: str, strategy: str, params: dict,
                 start_date: str, end_date: str, data_dir: str = "data") -> dict:
    """
    自定义回测函数。

    参数：
    - symbol: 股票代码
    - strategy: "ma_cross" 或 "macd_zero"
    - params: 策略参数 dict（ma_fast, ma_slow, stop_loss, take_profit 等）
    - start_date: 开始日期 YYYY-MM-DD
    - end_date: 结束日期 YYYY-MM-DD
    - data_dir: 数据目录

    返回：BacktestReport dict，含 annual_return、max_drawdown、win_rate、sharpe、curve、signals

    异常：
    - ValueError: 有效交易日 < 30
    """
    if strategy not in ("ma_cross", "macd_zero"):
        raise ValueError(f"不支持的策略: {strategy}，仅支持 ma_cross 和 macd_zero")

    all_rows = _load_daily_csv(symbol, data_dir)
    rows = _filter_by_date(all_rows, start_date, end_date)

    if len(rows) < 30:
        raise ValueError(
            f"有效交易日不足：{len(rows)} 个交易日，至少需要 30 个交易日"
        )

    # 生成信号
    signals = []
    position = 0.0  # 0=空仓, 1=持仓
    entry_price = 0.0
    stop_loss = float(params.get("stop_loss", 0.05))
    take_profit = float(params.get("take_profit", 0.10))

    for i, row in enumerate(rows):
        close = _get_close(row)
        date = row.get("日期", row.get("date_only", ""))[:10]
        if close <= 0:
            continue

        signal = None
        if strategy == "ma_cross":
            ma5 = _get_ma(row, "MA5")
            ma20 = _get_ma(row, "MA20")
            if i > 0:
                prev = rows[i - 1]
                prev_ma5 = _get_ma(prev, "MA5")
                prev_ma20 = _get_ma(prev, "MA20")
                if prev_ma5 <= prev_ma20 and ma5 > ma20:
                    signal = "BUY"
                elif prev_ma5 >= prev_ma20 and ma5 < ma20:
                    signal = "SELL"
        elif strategy == "macd_zero":
            macd = _get_macd_hist(row)
            if i > 0:
                prev_macd = _get_macd_hist(rows[i - 1])
                if prev_macd <= 0 and macd > 0:
                    signal = "BUY"
                elif prev_macd >= 0 and macd < 0:
                    signal = "SELL"

        # 止损/止盈
        if position > 0 and entry_price > 0:
            pnl_pct = (close - entry_price) / entry_price
            if pnl_pct <= -stop_loss:
                signal = "SELL"
            elif pnl_pct >= take_profit:
                signal = "SELL"

        if signal == "BUY" and position == 0:
            position = 1.0
            entry_price = close
            signals.append({"date": date, "action": "BUY", "price": close, "pnl": 0.0})
        elif signal == "SELL" and position > 0:
            pnl = (close - entry_price) * 100  # 假设 100 股
            signals.append({"date": date, "action": "SELL", "price": close, "pnl": round(pnl, 4)})
            position = 0.0
            entry_price = 0.0

    # 生成净值曲线
    curve = []
    strategy_val = 1.0
    hold_val = 1.0
    prev_close = _get_close(rows[0]) if rows else 1.0
    pos = 0.0
    entry = 0.0

    # 重新模拟净值
    for i, row in enumerate(rows):
        close = _get_close(row)
        date = row.get("日期", row.get("date_only", ""))[:10]
        if close <= 0 or prev_close <= 0:
            curve.append({"date": date, "strategy": round(strategy_val, 6), "hold": round(hold_val, 6)})
            continue

        daily_ret = (close - prev_close) / prev_close
        hold_val *= (1 + daily_ret)

        # 找当天是否有信号
        day_signal = next((s for s in signals if s["date"] == date), None)
        if day_signal:
            if day_signal["action"] == "BUY":
                pos = 1.0
                entry = close
            elif day_signal["action"] == "SELL":
                pos = 0.0

        if pos > 0:
            strategy_val *= (1 + daily_ret)

        curve.append({"date": date, "strategy": round(strategy_val, 6), "hold": round(hold_val, 6)})
        prev_close = close

    report = {
        "symbol": symbol,
        "strategy": strategy,
        "params": params,
        "metrics": {
            "annual_return": _calc_annual_return(curve),
            "max_drawdown": _calc_max_drawdown(curve),
            "win_rate": _calc_win_rate([s for s in signals if s["action"] == "SELL"]),
            "sharpe": _calc_sharpe(curve),
            "total_trades": len([s for s in signals if s["action"] == "SELL"]),
        },
        "curve": curve,
        "signals": [{"date": s["date"], "action": s["action"], "price": s["price"]}
                    for s in signals],
    }
    return report
