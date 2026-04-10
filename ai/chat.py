import json

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
_HIGH_RISK_KEYWORDS = ["全仓", "加杠杆", "梭哈", "all in", "满仓", "借钱", "融资", "all-in"]
_DISCLAIMER = "\n\n⚠️ 以上内容仅供学习参考，不构成投资建议。"

_MAX_HISTORY = 20  # 保留最近 20 条对话历史


class InteractiveAdvisor:
    def __init__(self):
        self.client = get_client()

    def ask(self, query: str, history: list = None, context: str = ""):
        """
        query: 用户的问题
        history: 对话历史 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        context: 当前市场背景（股票代码、最新收盘价等）
        """
        # 截断历史，保留最近 _MAX_HISTORY 条
        if history and len(history) > _MAX_HISTORY:
            history = history[-_MAX_HISTORY:]

        # 强制注入股票代码和最新价格到 context（若 context 中已有则不重复）
        # context 格式约定：调用方传入 "symbol:XXXXXX price:XX.XX ..."
        # 此处确保 context 非空时包含这些信息（由调用方负责传入，这里做保底）
        if not context:
            context = "（当前无行情上下文）"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n**当前市场与上下文背景：**\n" + context}
        ]

        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": query})

        try:
            resp = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=TEMPERATURE + 0.2,
                max_tokens=MAX_TOKENS + 400,
            )
            response = resp.choices[0].message.content.strip()

            # 高风险操作追加免责声明
            combined = query + response
            if any(kw in combined for kw in _HIGH_RISK_KEYWORDS):
                response += _DISCLAIMER

            return response
        except Exception as e:
            return f"抱歉，YoungQuant-v1 正忙于计算深度模型，请稍后再试。错误: {str(e)}"
