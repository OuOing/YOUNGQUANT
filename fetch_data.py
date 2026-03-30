import akshare as ak
import pandas as pd
import os
import argparse

def fetch_stock_data(symbol, period="daily"):
    """
    获取股票历史数据
    period: 'daily', 'weekly', 'monthly' for daily bars
            '1', '5', '15', '30', '60' for minute-level bars
    """
    print(f"正在获取股票 {symbol} 的 {period} 数据...")
    
    try:
        if period in ['daily', 'weekly', 'monthly']:
            # 日线及以上级别
            df = ak.stock_zh_a_hist(symbol=symbol, period=period, adjust="qfq")
        else:
            # 分钟级别
            df = ak.stock_zh_a_hist_min_em(symbol=symbol, period=period, adjust="qfq")
            # 统一列名：分钟级的列名是 '时间', '开盘', '收盘' 等
            df = df.rename(columns={
                '时间': '日期',
                '开盘': '开盘',
                '收盘': '收盘',
                '最高': '最高',
                '最低': '最低',
                '成交量': '成交量'
            })
            
        if df.empty:
            print("获取到的数据为空，请检查代码或网络。")
            return None
            
        print(f"成功获取 {len(df)} 条数据。")
        return df
    except Exception as e:
        print(f"获取数据失败: {e}")
        return None

def fetch_macro_data(symbol="HG"):
    """
    获取宏观/因子数据，例如铜价 (HG)
    说明：暂时使用 AkShare 获取相关的商品期货或商品指数作为额外因子
    """
    print(f"正在获取宏观因子 {symbol} (铜价)...")
    try:
        # 简化版：获取纽约铜期货行情作为示例因子
        df = ak.futures_foreign_hist_em(symbol=symbol)
        if df is not None:
            df = df.rename(columns={'date': '日期', 'close': '铜价'})
            # 只保留日期和收盘价
            df = df[['日期', '铜价']]
            # 下一步可以在 prepare_features.py 中进行 merge
            return df
    except Exception as e:
        print(f"宏观数据获取失败: {e}")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, default="601899", help="股票代码")
    parser.add_argument("--period", type=str, default="daily", help="时间周期 (daily, 15, 60等)")
    args = parser.parse_args()

    # 获取股票数据
    stock_df = fetch_stock_data(args.symbol, args.period)
    
    if stock_df is not None:
        # 保存到本地 CSV
        # 铜价暂时固定逻辑
        macro_df = fetch_macro_data("HG")
        
        stock_filename = f"stock_{args.symbol}.csv"
        if args.period != "daily":
            stock_filename = f"stock_{args.symbol}_{args.period}m.csv"
            
        stock_df.to_csv(stock_filename, index=False)
        print(f"股票数据已保存到 {stock_filename}")
        
        if macro_df is not None:
            macro_df.to_csv("macro_factors.csv", index=False)
            print("宏观数据已保存到 macro_factors.csv")
            
        print("\n🚀 所有数据就绪！可以运行 prepare_features.py")
    else:
        print("\n⚠️  股票数据获取失败。")
