import akshare as ak
import pandas as pd

# 测试获取 15 分钟 A 股历史数据
symbol = "601899"
period = "15" # 15分钟

print(f"Fetching {period}m data for {symbol}...")
try:
    df = ak.stock_zh_a_hist_min_em(symbol=symbol, period=period, adjust="")
    print("\nColumns:", df.columns.tolist())
    print("\nFirst 5 rows:\n", df.head())
    print("\nLast 5 rows:\n", df.tail())
except Exception as e:
    print(f"Error: {e}")
