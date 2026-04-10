#!/usr/bin/env python3
"""
批量生成特征文件：对所有有原始数据的股票运行 prepare_features.py
用法：python3 init_features.py [--period daily|15|all]
"""
import subprocess
import sys
import time
import sqlite3
import os

DB_PATH = "youngquant.db"

def get_symbols_with_data(period):
    """从数据库查询有原始K线数据的股票"""
    if not os.path.exists(DB_PATH):
        DB_PATH2 = "server/youngquant.db"
        if os.path.exists(DB_PATH2):
            db = DB_PATH2
        else:
            print("找不到数据库文件")
            return []
    else:
        db = DB_PATH
    
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT symbol FROM stock_bars WHERE period = ?", (period,))
    symbols = [r[0] for r in cur.fetchall()]
    conn.close()
    return symbols

def run_features(symbol, period):
    print(f"  特征工程 {symbol} [{period}]...", end=" ", flush=True)
    try:
        result = subprocess.run(
            ["python3", "prepare_features.py", "--symbol", symbol, "--period", period],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            print("✓")
        else:
            print(f"✗ {result.stderr[:80]}")
    except Exception as e:
        print(f"✗ {e}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--period", default="daily", choices=["daily", "15", "all"])
    args = parser.parse_args()

    periods = ["daily", "15"] if args.period == "all" else [args.period]

    for period in periods:
        symbols = get_symbols_with_data(period)
        print(f"\n[{period}] 找到 {len(symbols)} 只股票有原始数据")
        for i, sym in enumerate(symbols, 1):
            print(f"[{i}/{len(symbols)}]", end=" ")
            run_features(sym, period)

    print("\n✅ 特征生成完成！")

if __name__ == "__main__":
    main()
