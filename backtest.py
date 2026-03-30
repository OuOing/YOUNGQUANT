import pandas as pd
import numpy as np
import joblib
import argparse
import os

def backtest(symbol, period="daily"):
    """
    向量化回测：模拟根据模型信号进行交易
    """
    feature_file = f"features_{symbol}_v3.csv"
    if period != "daily":
        feature_file = f"features_{symbol}_{period}m_v3.csv"
        
    if not os.path.exists(feature_file):
        print(f"找不到特征文件: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df = df.sort_values('日期')

    # 加载模型
    model_name = f"model_{symbol}.pkl"
    if period != "daily":
        model_name = f"model_{symbol}_{period}m.pkl"
        
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
    res_file = f"backtest_results_{symbol}.csv"
    if period != "daily":
        res_file = f"backtest_results_{symbol}_{period}m.csv"
        
    df[['日期', '收盘', 'pred', 'strategy_cum', 'hold_cum']].to_csv(res_file, index=False)
    print(f"[{period}] 回测完成。结果已保存到 {res_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899")
    parser.add_argument("--period", type=str, default="daily")
    args = parser.parse_args()
    
    backtest(args.symbol, args.period)
