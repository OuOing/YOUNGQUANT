import pandas as pd
import numpy as np
try:
    import xgboost as xgb
    USE_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    USE_XGB = False
from sklearn.model_selection import train_test_split
import joblib
import argparse
import os

def train_model(symbol, period="daily"):
    """
    训练基于技术指标的 XGBoost 分类器（向后兼容 RandomForest）
    目标：预测未来一个周期的涨跌 (Binary)
    """
    feature_file = os.path.join("data", f"features_{symbol}_v3.csv")
    if period != "daily":
        feature_file = os.path.join("data", f"features_{symbol}_{period}m_v3.csv")
        
    if not os.path.exists(feature_file):
        print(f"找不到特征文件: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df = df.sort_values('日期')

    df['target'] = (df['收盘'].shift(-1) > df['收盘']).astype(int)
    
    features = ['MA5_Ratio', 'MA20_Ratio', 'RSI14', 'MACD_Hist', '铜价涨幅', '收益率']
    
    df = df.dropna()

    X = df[features]
    y = df['target']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    if USE_XGB:
        model = xgb.XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            use_label_encoder=False, eval_metric='logloss',
            random_state=42
        )
        print(f"[{period}] 使用 XGBoost (n=300, depth=6, lr=0.05)")
    else:
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        print(f"[{period}] XGBoost 未安装，回退到 RandomForest")
    
    model.fit(X_train, y_train)

    acc = model.score(X_test, y_test)
    print(f"[{period}] 模型训练完成。测试集准确率: {acc:.2%}")
    
    # 特征重要性
    if USE_XGB:
        imp = dict(zip(features, model.feature_importances_))
        top = sorted(imp.items(), key=lambda x: -x[1])[:3]
        print(f"[{period}] Top-3 特征: {', '.join(f'{k}={v:.3f}' for k,v in top)}")

    model_name = os.path.join("data", f"model_{symbol}.pkl")
    if period != "daily":
        model_name = os.path.join("data", f"model_{symbol}_{period}m.pkl")
        
    joblib.dump(model, model_name)
    print(f"模型已保存为 {model_name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899")
    parser.add_argument("--period", type=str, default="daily")
    args = parser.parse_args()
    
    train_model(args.symbol, args.period)
