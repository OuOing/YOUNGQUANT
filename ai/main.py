import json
import argparse
import sys
import os
from dotenv import load_dotenv
from .advisor import QuantitativeAdvisor
from .chat import InteractiveAdvisor
from .news import get_today_finance_news

load_dotenv()

def main():
    parser = argparse.ArgumentParser(description="YoungQuant-v1 AI Advisor & Chat Entry Point")
    parser.add_argument("--mode", default="analyze", choices=["analyze", "chat", "news"], help="Execution mode")
    parser.add_argument("--symbol", help="Stock symbol (e.g., 601899)")
    parser.add_argument("--period", default="15", help="Granularity")
    parser.add_argument("--query", help="User chat query")
    parser.add_argument("--history", help="Chat history (JSON string)")
    parser.add_argument("--context", help="Current context (Indicators, News, etc.)")

    args = parser.parse_args()
    
    try:
        if args.mode == "analyze":
            if not args.symbol: raise ValueError("Symbol required for analyze mode")
            advisor = QuantitativeAdvisor(args.symbol, args.period)
            print(json.dumps(advisor.generate_report(), ensure_ascii=False))
            
        elif args.mode == "news":
            news = get_today_finance_news()
            print(json.dumps(news, ensure_ascii=False))
            
        elif args.mode == "chat":
            if not args.query: raise ValueError("Query required for chat mode")
            
            history = []
            if args.history:
                try: history = json.loads(args.history)
                except: pass
                
            advisor = InteractiveAdvisor()
            response = advisor.ask(args.query, history, args.context or "")
            print(json.dumps({"response": response}, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "signal": "HOLD",
            "response": f"YoungQuant-v1 遇到内部逻辑陷阱：{str(e)}"
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()
