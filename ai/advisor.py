import json
import os
import pandas as pd
from .config import SYSTEM_PROMPT, MODEL_NAME, TEMPERATURE, MAX_TOKENS
from .provider import get_client

class QuantitativeAdvisor:
    def __init__(self, symbol: str, period: str = "15"):
        self.symbol = symbol
        self.period = period
        self.feature_file = f"features_{symbol}_{period}m_v3.csv" if period != "daily" else f"features_{symbol}_v3.csv"

    def _prepare_data(self):
        if not os.path.exists(self.feature_file):
            raise FileNotFoundError(f"Feature file {self.feature_file} not found. Please refresh data first.")
        
        df = pd.read_csv(self.feature_file).tail(20)
        return df[['日期','开盘','收盘','最高','最低','RSI14','MACD_Hist']].to_string(index=False)

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
            
            return json.loads(text.strip())
        except Exception as e:
            return {
                "signal": "HOLD",
                "confidence": 0.5,
                "reason": f"分析异常: {str(e)[:80]}",
                "risk": "API 响应连接中断或文件缺失",
                "expert_tip": "建议稍后再试或检查 .env 配置"
            }
