import akshare as ak
import json
import datetime

def get_today_finance_news():
    """
    抓取今日主要的财经新闻 (使用 akshare 的 news_cctv 或 similar)
    """
    try:
        # 使用 CCTV 财经新闻作为权威来源
        df = ak.news_cctv(date=datetime.datetime.now().strftime("%Y%m%d"))
        if df.empty:
            return []
        
        # 只取前 8 条精华
        news_list = []
        for _, row in df.head(8).iterrows():
            news_list.append({
                "title": row['title'],
                "content": row['content'][:200] + "..." if len(row['content']) > 200 else row['content']
            })
        return news_list
    except Exception as e:
        print(f"Error fetching news: {e}")
        return []

if __name__ == "__main__":
    news = get_today_finance_news()
    print(json.dumps(news, ensure_ascii=False))
