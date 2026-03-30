from typing import TypedDict

class AIAnalysisResult(TypedDict):
    signal: str      # BUY, SELL, HOLD
    confidence: float # 0.0 - 1.0
    reason: str      # Analysis reason (within 80 chars)
    risk: str        # Core risk point (within 40 chars)
    expert_tip: str  # Extra expert insight (within 40 chars)
