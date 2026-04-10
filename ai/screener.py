import os
import csv

try:
    import pandas as pd
    _HAS_PANDAS = True
except ImportError:
    _HAS_PANDAS = False


# 支持的股票列表
STOCK_NAMES = {
    "601899": "紫金矿业",
    "600519": "贵州茅台",
    "300750": "宁德时代",
    "601318": "中国平安",
    "000001": "平安银行",
}

# 板块权重
SECTOR_WEIGHTS = {
    "601899": 0.8,  # 有色金属
    "300750": 0.8,  # 新能源
    "600519": 0.6,  # 白酒
    "601318": 0.6,  # 金融
    "000001": 0.5,  # 银行
}


class StockScreener:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir

    def _load_daily_features(self, symbol: str):
        """加载日线特征文件，失败返回 None。优先用 pandas，无 pandas 时用纯 Python。"""
        path = os.path.join(self.data_dir, f"features_{symbol}_v3.csv")
        if not os.path.exists(path):
            return None
        try:
            if _HAS_PANDAS:
                return pd.read_csv(path)
            else:
                # 纯 Python fallback：返回 list[dict]
                with open(path, newline="", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    return list(reader)
        except Exception:
            return None

    def _get_col(self, data, col_names):
        """从 DataFrame 或 list[dict] 中提取列，返回 float 列表。"""
        if _HAS_PANDAS and isinstance(data, pd.DataFrame):
            for col in col_names:
                if col in data.columns:
                    return [float(v) for v in data[col].dropna().tolist()]
            return []
        else:
            # list[dict]
            for col in col_names:
                vals = []
                for row in data:
                    v = row.get(col)
                    if v is not None and v != "":
                        try:
                            vals.append(float(v))
                        except (ValueError, TypeError):
                            pass
                if vals:
                    return vals
            return []

    def _len(self, data) -> int:
        """返回数据行数。"""
        if _HAS_PANDAS and isinstance(data, pd.DataFrame):
            return len(data)
        return len(data)

    def _calc_trend_score(self, data) -> float:
        """趋势得分：基于最近 5 日 MA5 vs MA20 的相对位置"""
        try:
            ma5_vals = self._get_col(data, ["MA5"])[-5:]
            ma20_vals = self._get_col(data, ["MA20"])[-5:]
            if not ma5_vals or not ma20_vals:
                return 0.5
            n = min(len(ma5_vals), len(ma20_vals))
            if n == 0:
                return 0.5
            count = sum(1 for i in range(n) if ma5_vals[i] > ma20_vals[i])
            return count / n
        except Exception:
            return 0.5

    def _calc_capital_score(self, data) -> float:
        """资金得分：基于最近 5 日成交量变化趋势（量增得分高）"""
        try:
            vals = self._get_col(data, ["成交量", "volume", "Volume"])[-5:]
            if len(vals) < 2:
                return 0.5
            up_count = sum(1 for i in range(1, len(vals)) if vals[i] > vals[i - 1])
            return up_count / (len(vals) - 1)
        except Exception:
            return 0.5

    def _calc_sector_score(self, symbol: str) -> float:
        """板块得分：基于预定义板块权重"""
        return SECTOR_WEIGHTS.get(symbol, 0.5)

    def _calc_technical_score(self, data) -> float:
        """技术得分：基于 RSI14（40-60 区间得分高，超买超卖得分低）"""
        try:
            vals = self._get_col(data, ["RSI14", "rsi14", "RSI"])[-5:]
            if not vals:
                return 0.5
            rsi = vals[-1]
            if 40 <= rsi <= 60:
                return 1.0 - abs(rsi - 50) / 10 * 0.2
            elif rsi < 40:
                return max(0.0, rsi / 40 * 0.8)
            else:
                return max(0.0, (100 - rsi) / 40 * 0.8)
        except Exception:
            return 0.5

    def _build_reason(self, symbol: str, scores: dict, composite: float) -> str:
        """根据得分生成简短说明（<=50字）"""
        name = STOCK_NAMES.get(symbol, symbol)
        parts = []
        if "trend" in scores and scores["trend"] >= 0.6:
            parts.append("趋势向上")
        if "capital" in scores and scores["capital"] >= 0.6:
            parts.append("量能放大")
        if "sector" in scores and scores["sector"] >= 0.7:
            parts.append("板块强势")
        if "technical" in scores and scores["technical"] >= 0.7:
            parts.append("技术健康")
        if not parts:
            parts.append("综合评分适中")
        reason = f"{name}：{'、'.join(parts)}，综合得分{composite:.2f}"
        # 截断到 50 字
        if len(reason) > 50:
            reason = reason[:50]
        return reason

    def screen(self, dimensions: list[str]) -> list[dict]:
        """
        从 data/ 目录读取各股票特征文件，按维度评分，返回最多 10 只候选股票。

        参数：
        - dimensions: 筛选维度列表，可包含 "trend"、"capital"、"sector"、"technical"

        返回格式：
        [{"symbol": str, "name": str, "reason": str(<=50字), "risk_level": "低"|"中"|"高",
          "trend_score": float, "capital_score": float}]
        最多返回 10 只
        """
        if not dimensions:
            dimensions = ["trend", "capital", "sector", "technical"]

        results = []

        for symbol, name in STOCK_NAMES.items():
            try:
                df = self._load_daily_features(symbol)
                if df is None:
                    continue

                # 过滤 K 线数量 < 20 的股票
                if self._len(df) < 20:
                    continue

                scores = {}
                if "trend" in dimensions:
                    scores["trend"] = self._calc_trend_score(df)
                if "capital" in dimensions:
                    scores["capital"] = self._calc_capital_score(df)
                if "sector" in dimensions:
                    scores["sector"] = self._calc_sector_score(symbol)
                if "technical" in dimensions:
                    scores["technical"] = self._calc_technical_score(df)

                if not scores:
                    continue

                composite = sum(scores.values()) / len(scores)

                # 风险等级
                if composite >= 0.7:
                    risk_level = "低"
                elif composite >= 0.4:
                    risk_level = "中"
                else:
                    risk_level = "高"

                reason = self._build_reason(symbol, scores, composite)

                results.append({
                    "symbol": symbol,
                    "name": name,
                    "reason": reason,
                    "risk_level": risk_level,
                    "trend_score": round(scores.get("trend", 0.0), 4),
                    "capital_score": round(scores.get("capital", 0.0), 4),
                    "composite_score": round(composite, 4),
                })

            except Exception:
                continue

        # 按综合得分降序排序，取前 10
        results.sort(key=lambda x: x["composite_score"], reverse=True)
        results = results[:10]

        # 移除内部字段 composite_score（不在返回规范中，但保留方便调试）
        return results
