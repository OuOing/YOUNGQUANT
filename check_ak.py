import akshare as ak
import sys

print(f"Python Version: {sys.version}")
print(f"AkShare Version: {ak.active_version if hasattr(ak, 'active_version') else 'Unknown'}")

try:
    print("\n尝试 1: 获取日线数据 (默认格式)...")
    df = ak.stock_zh_a_hist(symbol="601899", period="daily", start_date="20240101", end_date="20240301", adjust="qfq")
    print("✅ 尝试 1 成功！")
    print(df.head())
except Exception as e:
    print(f"❌ 尝试 1 失败: {e}")

try:
    print("\n尝试 2: 获取日线数据 (不加复权)...")
    df = ak.stock_zh_a_hist(symbol="601899", period="daily", start_date="20240101", end_date="20240301", adjust="")
    print("✅ 尝试 2 成功！")
except Exception as e:
    print(f"❌ 尝试 2 失败: {e}")

try:
    print("\n尝试 3: 获取实时行情 (检查网络和基本连通性)...")
    df = ak.stock_zh_a_spot_em()
    print("✅ 尝试 3 成功！")
    print(df.head(2))
except Exception as e:
    print(f"❌ 尝试 3 失败: {e}")
