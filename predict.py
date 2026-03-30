import pandas as pd
import joblib
import json
import argparse
import os

def predict_signal(symbol, period="daily"):
    """
    加载最新特征，使用最新模型进行预测
    """
    # 动态构造文件名
    feature_file = f"features_{symbol}_v3.csv"
    if period != "daily":
        feature_file = f"features_{symbol}_{period}m_v3.csv"
        
    if not os.path.exists(feature_file):
        return {"error": f"Features file not found for {period}"}

    df = pd.read_csv(feature_file)
    df = df.sort_values('日期')
    
    # 获取最后一行数据
    latest = df.iloc[-1]
    
    # 特征
    features_cols = ['MA5_Ratio', 'MA20_Ratio', 'RSI14', 'MACD_Hist', '铜价涨幅', '收益率']
    X_latest = pd.DataFrame([latest[features_cols]])

    # 加载模型
    model_name = f"model_{symbol}.pkl"
    if period != "daily":
        model_name = f"model_{symbol}_{period}m.pkl"
        
    if not os.path.exists(model_name):
        return {"error": f"Model not found for {period}"}
        
    model = joblib.load(model_name)
    prediction = model.predict(X_latest)[0]
    confidence = model.predict_proba(X_latest)[0][prediction]

    # 构造返回结果
    res = {
        "symbol": symbol,
        "date": str(latest['日期']),
        "close": float(latest['收盘']),
        "signal": "BUY" if prediction == 1 else "SELL",
        "confidence": float(confidence),
        "period": period
    }
    
    return res

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899")
    parser.add_argument("--period", type=str, default="daily")
    args = parser.parse_args()
    
    result = predict_signal(args.symbol, args.period)
    print(json.dumps(result))
