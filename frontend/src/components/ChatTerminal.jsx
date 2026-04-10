import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Bot, RotateCcw, ChevronRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import TermTooltip from './TermTooltip';

// 简单 Markdown 渲染：把常见格式转为 JSX
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // ### 标题
    if (line.startsWith('### ')) {
      return <p key={i} className="font-black text-white text-sm mt-3 mb-1">{line.slice(4)}</p>;
    }
    if (line.startsWith('## ')) {
      return <p key={i} className="font-black text-white text-base mt-3 mb-1">{line.slice(3)}</p>;
    }
    if (line.startsWith('# ')) {
      return <p key={i} className="font-black text-white text-lg mt-3 mb-1">{line.slice(2)}</p>;
    }
    // 空行
    if (line.trim() === '') return <div key={i} className="h-2" />;

    // 处理行内格式：**粗体** 和 *斜体*
    const parts = [];
    let remaining = line;
    let partKey = 0;

    // 列表项
    const isList = remaining.startsWith('- ') || remaining.startsWith('* ') || /^\d+\.\s/.test(remaining);
    if (isList) {
      remaining = remaining.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
    }

    // 解析行内 **bold** 和 *italic*
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = inlineRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={partKey++}>{remaining.slice(lastIndex, match.index)}</span>);
      }
      if (match[0].startsWith('**')) {
        parts.push(<strong key={partKey++} className="font-black text-white">{match[2]}</strong>);
      } else {
        parts.push(<em key={partKey++} className="text-white/80">{match[3]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(<span key={partKey++}>{remaining.slice(lastIndex)}</span>);
    }

    if (isList) {
      return (
        <div key={i} className="flex gap-2 items-start my-0.5">
          <span className="text-secondary mt-0.5 shrink-0">·</span>
          <span className="text-white/80 text-[13px] leading-relaxed">{parts}</span>
        </div>
      );
    }

    return <p key={i} className="text-white/80 text-[13px] leading-relaxed">{parts}</p>;
  });
}
function getSuggestions(symbol, stockName, price) {
  const name = stockName || symbol;
  return [
    `${name} 今日走势如何？`,
    `${name} 当前技术面分析`,
    `${name} 值得买入吗？`,
    `解释一下 MACD 指标`,
    `今日市场热点板块`,
    `${price > 0 ? `${name} 现价 ¥${price.toFixed(2)}，是否高估？` : '如何判断股票估值？'}`,
  ];
}

const ChatTerminal = ({ symbol, price, period, stockName, token, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const scrollRef = useRef();

  const suggestions = getSuggestions(symbol, stockName, price);

  const fetchNewsAndGreet = useCallback(async () => {
    const loadingId = Date.now();
    setMessages([{ role: 'ai', text: '正在同步市场情报...', id: loadingId, loading: true }]);
    try {
      const res = await fetch('/api/news');
      const news = await res.json();
      const target = `${stockName || symbol}`;
      let text = `你好！我是 YoungQuant-v1，当前关注 **${target}**（${period === 'daily' ? '日线' : '15分钟线'}）。\n\n`;
      if (Array.isArray(news) && news.length > 0) {
        text += `今日财经快讯：\n`;
        news.slice(0, 3).forEach((n, i) => { text += `${i + 1}. ${n.title}\n`; });
      } else {
        text += `今日市场暂无重大突发信号，建议关注个股基本面与技术形态。`;
      }
      text += `\n\n你可以直接点击下方建议，或输入任何问题。`;
      setMessages([{ role: 'ai', text, id: Date.now() }]);
    } catch {
      setMessages([{ role: 'ai', text: `你好！我是 YoungQuant-v1，专注 A 股量化分析。\n\n请选择下方建议或直接提问。`, id: Date.now() }]);
    }
  }, [period, symbol, stockName]);

  useEffect(() => {
    setInput('');
    setIsTyping(false);
    setSessionCount(0);
    fetchNewsAndGreet();
  }, [symbol, period, fetchNewsAndGreet]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (customQuery = null) => {
    if (isTyping) return;
    const query = customQuery || input.trim();
    if (!query) return;
    if (!customQuery) setInput('');

    const userMsg = { role: 'user', text: query, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    const newCount = sessionCount + 1;
    setSessionCount(newCount);

    // 标记"向AI提问"新手任务
    if (!localStorage.getItem('yq_task_ask_ai')) {
      localStorage.setItem('yq_task_ask_ai', '1');
    }

    try {
      const historySource = [...messages, userMsg].slice(-8);
      const historyPayload = JSON.stringify(
        historySource.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        }))
      );

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          history: historyPayload,
          context: `symbol:${symbol} price:${price} period:${period} name:${stockName || symbol}`,
          session_count: newCount,
        }),
      });

      if (res.status === 403) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'ai',
          text: '👋 你已使用了本次会话的 5 条免费消息。\n\n注册账号后可解锁无限 AI 对话，同时享有：\n- 交易记录永久保存\n- 学习进度同步\n- 排行榜参与资格\n\n注册完全免费，点击右上角「注册」即可。',
          id: Date.now(),
        }]);
        return;
      }

      const data = await res.json();
      if (data?.error) throw new Error(data.error);

      const responseText = data.response || data.text || JSON.stringify(data);
      setIsTyping(false);

      const aiMsgId = Date.now();
      setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMsgId }]);

      // 打字机效果
      let i = 0;
      const timer = setInterval(() => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: responseText.substring(0, i + 1) } : m
        ));
        i++;
        if (i >= responseText.length) clearInterval(timer);
      }, 12);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `AI 服务暂时不可用，请稍后重试。\n错误：${err.message || '未知错误'}`,
        id: Date.now(),
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      {/* 消息列表 */}
      <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        <div className="flex flex-col gap-4 py-2">
          {messages.map(m => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
              {/* 头像 */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                m.role === 'user'
                  ? 'bg-secondary/20 border border-secondary/30'
                  : 'bg-white/10 border border-white/10'
              }`}>
                {m.role === 'user'
                  ? <span className="text-[10px] font-black text-secondary">我</span>
                  : <Sparkles size={12} className="text-white/60" />
                }
              </div>

              {/* 气泡 */}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-secondary/15 border border-secondary/25 text-white rounded-tr-sm'
                  : 'bg-white/[0.04] border border-white/8 text-white/85 rounded-tl-sm'
              }`}>
                {m.loading ? (
                  <div className="flex gap-1.5 items-center py-0.5">
                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" />
                  </div>
                ) : m.role === 'ai' ? (
                  <div className="flex flex-col gap-0.5">
                    {renderMarkdown(m.text)}
                  </div>
                ) : (
                  <span>{m.text}</span>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 flex-row animate-fade-in">
              <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles size={12} className="text-secondary animate-pulse" />
              </div>
              <div className="bg-white/[0.04] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 发言建议 */}
      {messages.length <= 1 && !isTyping && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {suggestions.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/50 hover:bg-secondary/10 hover:border-secondary/30 hover:text-secondary transition-all font-medium"
            >
              <ChevronRight size={10} className="opacity-60" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-white/5 pt-3 px-1">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`问问 ${stockName || symbol} 的行情...`}
            disabled={isTyping}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-secondary/40 focus:bg-white/8 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isTyping || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30 text-secondary hover:bg-secondary/30 disabled:opacity-30 transition-all"
          >
            <Send size={13} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[9px] text-white/20">Enter 发送 · AI 仅供参考，不构成投资建议</span>
          <button
            onClick={() => { setMessages([]); setSessionCount(0); fetchNewsAndGreet(); }}
            className="text-[9px] text-white/20 hover:text-white/50 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={9} /> 重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTerminal;
