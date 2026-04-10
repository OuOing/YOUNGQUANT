import json
import argparse
import sys
import os

# dotenv is optional
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def main():
    parser = argparse.ArgumentParser(description="YoungQuant-v1 AI Entry Point")
    parser.add_argument("--mode", default="analyze",
                        choices=["analyze", "chat", "news", "screener", "review_trade", "review_summary"])
    parser.add_argument("--symbol", help="Stock symbol")
    parser.add_argument("--period", default="15")
    parser.add_argument("--query")
    parser.add_argument("--history")
    parser.add_argument("--context")
    parser.add_argument("--dimensions")
    parser.add_argument("--trade")
    parser.add_argument("--trades")
    args = parser.parse_args()

    try:
        if args.mode == "analyze":
            from .advisor import QuantitativeAdvisor
            if not args.symbol:
                raise ValueError("Symbol required")
            advisor = QuantitativeAdvisor(args.symbol, args.period)
            print(json.dumps(advisor.generate_report(), ensure_ascii=False))

        elif args.mode == "news":
            try:
                from .news import get_today_finance_news
                news = get_today_finance_news()
            except ImportError:
                news = []
            print(json.dumps(news, ensure_ascii=False))

        elif args.mode == "screener":
            from .screener import StockScreener
            dimensions = [d.strip() for d in (args.dimensions or "").split(",") if d.strip()]
            screener = StockScreener()
            stocks = screener.screen(dimensions)
            print(json.dumps({"stocks": stocks}, ensure_ascii=False))

        elif args.mode == "review_trade":
            from .reviewer import TradeReviewer
            trade = json.loads(args.trade) if args.trade else {}
            reviewer = TradeReviewer()
            result = reviewer.review_trade(trade, [])
            print(json.dumps(result, ensure_ascii=False))

        elif args.mode == "review_summary":
            from .reviewer import TradeReviewer
            trades = json.loads(args.trades) if args.trades else []
            period = args.period if args.period in ("week", "month") else "week"
            reviewer = TradeReviewer()
            result = reviewer.review_summary(trades, period)
            print(json.dumps(result, ensure_ascii=False))

        elif args.mode == "chat":
            from .chat import InteractiveAdvisor
            if not args.query:
                raise ValueError("Query required")
            history = []
            if args.history:
                try:
                    history = json.loads(args.history)
                except Exception:
                    pass
            advisor = InteractiveAdvisor()
            response = advisor.ask(args.query, history, args.context or "")
            print(json.dumps({"response": response}, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "signal": "HOLD",
            "response": f"YoungQuant-v1 错误：{str(e)}"
        }, ensure_ascii=False))


if __name__ == "__main__":
    main()
