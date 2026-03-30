import json
from .config import SYSTEM_PROMPT, MODEL_NAME, TEMPERATURE, MAX_TOKENS
from .provider import get_client

class InteractiveAdvisor:
    def __init__(self):
        self.client = get_client()

    def ask(self, query: str, history: list = None, context: str = ""):
        """
        query: 用户的问题
        history: 对话历史 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        context: 当前市场背景 (股票指标、最新新闻、账户持仓等)
        """
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
                temperature=TEMPERATURE + 0.2, # 对话稍微增加一点发散性
                max_tokens=MAX_TOKENS + 400,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            return f"抱歉，YoungQuant-v1 正忙于计算深度模型，请稍后再试。错误: {str(e)}"
