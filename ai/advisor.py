import json
import os

try:
    import pandas as pd
    _HAS_PANDAS = True
except ImportError:
    _HAS_PANDAS = False

try:
    from .config import SYSTEM_PROMPT, MODEL_NAME, TEMPERATURE, MAX_TOKENS
    from .provider import get_client
    _HAS_CLIENT = True
except Exception:
    _HAS_CLIENT = False
    SYSTEM_PROMPT = ""
    MODEL_NAME = ""
    TEMPERATURE = 0.7
    MAX_TOKENS = 512
    def get_client():
        raise RuntimeError("openai not available")

# 高风险关键词，触发时追加免责声明
_HIGH_RISK_KEYWORDS = ["全仓", "加杠杆", "梭哈", "all in", "满仓", "借钱", "融资"]
_DISCLAIMER = "\n\n⚠️ 以上内容仅供学习参考，不构成投资建议。"

_VALID_SIGNALS = {"BUY", "SELL", "HOLD"}


def _enforce_report_fields(report: dict) -> dict:
    """确保报告包含四个必要字段且值合法。"""
    signal = str(report.get("signal", "HOLD")).upper()
    if signal not in _VALID_SIGNALS:
        signal = "HOLD"
    report["signal"] = signal

    confidence = report.get("confidence", 0.5)
    try:
        confidence = float(confidence)
        confidence = max(0.0, min(1.0, confidence))
    except (TypeError, ValueError):
        confidence = 0.5
    report["confidence"] = confidence

    reason = str(report.get("reason", ""))
    if len(reason) > 100:
        reason = reason[:100]
    report["reason"] = reason

    risk = str(report.get("risk", ""))
    if len(risk) > 50:
        risk = risk[:50]
    report["risk"] = risk

    return report

class QuantitativeAdvisor:
    def __init__(self, symbol: str, period: str = "15"):
        self.symbol = symbol
        self.period = period
        self.feature_file = os.path.join("data", f"features_{symbol}_{period}m_v3.csv" if period != "daily" else f"features_{symbol}_v3.csv")

    def _prepare_data(self):
        if not os.path.exists(self.feature_file):
            raise FileNotFoundError(f"Feature file {self.feature_file} not found. Please refresh data first.")
        if _HAS_PANDAS:
            df = pd.read_csv(self.feature_file).tail(20)
            return df[['日期','开盘','收盘','最高','最低','RSI14','MACD_Hist']].to_string(index=False)
        else:
            import csv
            with open(self.feature_file, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            rows = rows[-20:]
            cols = ['日期','开盘','收盘','最高','最低','RSI14','MACD_Hist']
            lines = ["\t".join(cols)]
            for r in rows:
                lines.append("\t".join(str(r.get(c, "")) for c in cols))
            return "\n".join(lines)

    def generate_report(self):
        try:
            klines = self._prepare_data()
            client = get_client()

            user_prompt = f"""股票代码：{self.symbol} ({self.period}分钟线)
数据详情：
{klines}

请按以下格式输出（仅返回 JSON，禁止任何 markdown 标记、解释或其他文本）：
{{"signal": "BUY"或"SELL"或"HOLD", "confidence": 0.0到1.0的浮动值, "reason": "深度量化研报摘要(分析指标背后的逻辑趋势，80字以内)", "risk": "主要对冲风险点(40字以内)", "expert_tip": "YoungQuant-v1 量价平衡建议(40字以内)"}}"""

            resp = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
            )

            text = resp.choices[0].message.content.strip()
            # Clean JSON if wrapped in markdown
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            result = json.loads(text.strip())
            return _enforce_report_fields(result)
        except Exception as e:
            return _enforce_report_fields({
                "signal": "HOLD",
                "confidence": 0.5,
                "reason": f"分析异常: {str(e)[:80]}",
                "risk": "API 响应连接中断或文件缺失",
                "expert_tip": "建议稍后再试或检查 .env 配置"
            })
