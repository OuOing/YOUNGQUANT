#!/usr/bin/env python3
"""
批量初始化股票数据：拉取日线 + 15分钟线，写入数据库特征表
用法：python3 init_data.py [--symbols 601899,600519,...] [--period daily|15|all]
"""
import subprocess
import sys
import argparse
import time

CORE_SYMBOLS = [
    # 已有数据的
    "601899", "601318", "600519", "300750", "000001",
    # 新增核心股票
    "600036", "000858", "600900", "601012", "000725",
    "002594", "600438", "300274", "688981", "002415",
    "300059", "000651", "000333", "600887", "601088",
    "600028", "601857", "600276", "000538", "002352",
    "600941", "601398", "601288",
]

def fetch(symbol, period, delay=2):
    print(f"  拉取 {symbol} [{period}]...", end=" ", flush=True)
    try:
        result = subprocess.run(
            ["python3", "fetch_data.py", "--symbol", symbol, "--period", period],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            print("✓")
        else:
            print(f"✗ {result.stderr[:80]}")
    except subprocess.TimeoutExpired:
        print("✗ 超时")
    except Exception as e:
        print(f"✗ {e}")
    time.sleep(delay)  # 避免频率过高被封

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", default=",".join(CORE_SYMBOLS))
    parser.add_argument("--period", default="daily", choices=["daily", "15", "all"])
    parser.add_argument("--delay", type=float, default=2.0, help="每次请求间隔秒数")
    args = parser.parse_args()

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    periods = ["daily", "15"] if args.period == "all" else [args.period]

    print(f"开始批量拉取：{len(symbols)} 只股票 × {len(periods)} 个周期")
    print(f"预计耗时：约 {len(symbols) * len(periods) * args.delay / 60:.1f} 分钟\n")

    for i, sym in enumerate(symbols, 1):
        print(f"[{i}/{len(symbols)}] {sym}")
        for period in periods:
            fetch(sym, period, args.delay)

    print("\n✅ 批量拉取完成！")
    print("下一步：运行 'python3 prepare_features.py --symbol <代码>' 生成特征文件")
    print("或者在界面点击「重训流水线」完成完整训练。")

if __name__ == "__main__":
    main()
