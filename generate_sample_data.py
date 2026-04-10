import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_stock(symbol, name, base_price, periods=500, freq='daily'):
    print(f"Generating synthetic data for {symbol} ({name})...")
    
    dates = []
    if freq == 'daily':
        start_date = datetime(2023, 1, 1)
        for i in range(periods):
            dt = start_date + timedelta(days=i)
            if dt.weekday() < 5: # Monday to Friday
                dates.append(dt.strftime('%Y-%m-%d'))
    else: # 15m
        start_date = datetime(2024, 1, 1, 9, 30)
        for i in range(periods):
            dt = start_date + timedelta(minutes=15 * i)
            # Simplified trading hours: 9:30-11:30, 13:00-15:00
            if dt.weekday() < 5:
                hour_min = dt.hour * 100 + dt.minute
                if (930 <= hour_min <= 1130) or (1300 <= hour_min <= 1500):
                    dates.append(dt.strftime('%Y-%m-%d %H:%M:%S'))
    
    n = len(dates)
    # Random walk with drift
    returns = np.random.normal(0.0005, 0.015, n)
    price_path = base_price * np.exp(np.cumsum(returns))
    
    df = pd.DataFrame({
        '日期': dates,
        '开盘': price_path * (1 + np.random.normal(0, 0.002, n)),
        '最高': price_path * (1 + np.abs(np.random.normal(0, 0.005, n))),
        '最低': price_path * (1 - np.abs(np.random.normal(0, 0.005, n))),
        '收盘': price_path,
        '成交量': np.random.randint(10000, 1000000, n).astype(float),
        '成交额': np.random.randint(1000000, 100000000, n).astype(float),
        '振幅': np.random.rand(n) * 5,
        '涨跌幅': returns * 100,
        '涨跌额': price_path * returns,
        '换手率': np.random.rand(n) * 2
    })
    
    filename = f"data/stock_{symbol}.csv" if freq == 'daily' else f"data/stock_{symbol}_15m.csv"
    df.to_csv(filename, index=False)
    print(f"Saved to {filename}")

popular_stocks = [
    ('600519', '贵州茅台', 1700),
    ('000001', '平安银行', 10),
    ('300750', '宁德时代', 160),
    ('601318', '中国平安', 40),
]

if not os.path.exists("data"):
    os.makedirs("data")

for symbol, name, price in popular_stocks:
    generate_stock(symbol, name, price, freq='daily')
    generate_stock(symbol, name, price, freq='15m', periods=2000)

print("\n✅ Synthetic data generation complete!")
