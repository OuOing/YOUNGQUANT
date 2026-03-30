import pandas as pd
import numpy as np
import argparse
import os

def prepare_features(symbol, period="daily"):
    """
    加载原始行情和宏观数据，生成技术指标特征
    """
    stock_file = f"stock_{symbol}.csv"
    if period != "daily":
        stock_file = f"stock_{symbol}_{period}m.csv"
        
    if not os.path.exists(stock_file):
        print(f"找不到数据文件: {stock_file}")
        return

    # 1. 加载行情数据
    df = pd.read_csv(stock_file)
    # 统一转换时间格式
    df['日期'] = pd.to_datetime(df['日期'])
    df = df.sort_values('日期')

    # 抽取纯日期用于后续与宏观数据合并 (daily granularity)
    df['date_only'] = df['日期'].dt.date

    # 2. 加载宏观因子 (铜价)
    if os.path.exists("macro_factors.csv"):
        m_df = pd.read_csv("macro_factors.csv")
        m_df['日期'] = pd.to_datetime(m_df['日期']).dt.date
        # 合并 (根据日期合并)
        df = pd.merge(df, m_df, left_on='date_only', right_on='日期', how='left', suffixes=('', '_m'))
        # 填充缺失的宏观数据 (前向填充)
        df['铜价'] = df['铜价'].ffill()
        df = df.drop(columns=['日期_m', 'date_only'])
    else:
        print("未发现 macro_factors.csv，跳过宏观因子。")
        df['铜价'] = 0

    # 3. 计算技术指标
    print(f"正在为 {period} 数据计算技术指标...")
    
    # -- 涨跌幅特征 --
    df['收益率'] = df['收盘'].pct_change()
    if (df['铜价'] == 0).all():
        df['铜价涨幅'] = 0
    else:
        df['铜价涨幅'] = df['铜价'].pct_change()

    # -- 移动平均线 (MA) --
    df['MA5'] = df['收盘'].rolling(window=5).mean()
    df['MA20'] = df['收盘'].rolling(window=20).mean()

    # -- MA 偏离率 --
    df['MA5_Ratio'] = df['收盘'] / df['MA5'] - 1
    df['MA20_Ratio'] = df['收盘'] / df['MA20'] - 1

    # -- 相对强弱指数 (RSI) --
    def calc_rsi(series, n=14):
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=n).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=n).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    df['RSI14'] = calc_rsi(df['收盘'])

    # -- MACD --
    ema12 = df['收盘'].ewm(span=12, adjust=False).mean()
    ema26 = df['收盘'].ewm(span=26, adjust=False).mean()
    df['MACD_Line'] = ema12 - ema26
    df['MACD_Signal'] = df['MACD_Line'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD_Line'] - df['MACD_Signal']

    # -- 布林带 (Bollinger Bands) --
    df['BB_Mid'] = df['收盘'].rolling(window=20).mean()
    df['BB_Std'] = df['收盘'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Mid'] + 2 * df['BB_Std']
    df['BB_Lower'] = df['BB_Mid'] - 2 * df['BB_Std']

    # 4. 去除空值 (MA/RSI 计算初期会产生空值)
    df = df.dropna()

    # 5. 保存特征文件
    output_file = f"features_{symbol}_v3.csv"
    if period != "daily":
        output_file = f"features_{symbol}_{period}m_v3.csv"
        
    df.to_csv(output_file, index=False)
    print(f"特征工程完成！结果已保存到 {output_file}，样本数: {len(df)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899", help="股票代码")
    parser.add_argument("--period", type=str, default="daily", help="时间周期")
    args = parser.parse_args()
    
    prepare_features(args.symbol, args.period)
