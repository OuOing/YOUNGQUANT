import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

const ChatTerminal = ({ symbol, price, period, stockName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef();

  const fetchNewsAndGreet = useCallback(async (isInitial) => {
    if (isInitial) setMessages([{ role: 'ai', text: '👋 正在为您同步全球市场情报...', id: Date.now() }]);
    try {
      const res = await fetch('/api/news');
      const news = await res.json();
      const target = `${stockName || symbol}（${period}）`;
      let text = `👋 你好！我是 YoungQuant-v1。当前关注：${target}。今日财经核心内参：\n\n`;
      if (news && news.length > 0) news.forEach((n, i) => text += `${i + 1}. ${n.title}\n`);
      else text = "👋 你好！今日市场暂无重大突发信号，建议关注个股基本面。";

      setMessages(prev => [
        ...prev.filter(m => m.text !== '👋 正在为您同步全球市场情报...'),
        { role: 'ai', text, id: Date.now() }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: "👋 你好！我是您的智能金融分析助手 YoungQuant-v1。", id: Date.now() }
      ]);
    }
  }, [period, symbol, stockName]);

  useEffect(() => {
    // 切换标的/周期时重置对话上下文（更符合“当前终端”的用户预期）
    setInput('');
    setIsTyping(false);
    fetchNewsAndGreet(true);
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

    try {
      // 由于 React state 更新是异步的，这里用“本轮追加用户消息后的历史”生成上下文
      const historySource = [...messages, userMsg].slice(-6);
      const historyPayload = JSON.stringify(
        historySource.map(m => ({
          // 后端 ai/chat.py 期望字段：{ role, content }
          // OpenAI role 允许 user/assistant/system；这里把 UI 的 ai 映射为 assistant
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.text
        }))
      );
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: historyPayload,
          context: `证券：${stockName || symbol} 现价：${price} 周期：${period}`
        })
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setIsTyping(false);
      
      const aiMsgId = Date.now();
      setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMsgId }]);
      
      // Typing effect
      let i = 0;
      const text = data.response || '';
      const timer = setInterval(() => {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: text.substring(0, i + 1) } : m));
        i++;
        if (i >= text.length) clearInterval(timer);
      }, 15);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: "YoungQuant-v1 暂时离线，请稍后再试。", id: Date.now() }]);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-8 py-2 pr-2 custom-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`max-w-[90%] p-6 rounded-3xl text-sm leading-relaxed animate-fade-in ${
            m.role === 'user' 
              ? 'bg-white text-black self-end rounded-br-none shadow-2xl font-bold' 
              : 'bg-black/40 text-text-main self-start rounded-bl-none border border-white/10 shadow-2xl'
          }`}>
            <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
          </div>
        ))}
        {isTyping && (
          <div className="self-start bg-black/40 p-6 rounded-3xl rounded-bl-none text-xs text-text-dim flex gap-4 items-center font-black animate-pulse uppercase tracking-widest border border-white/10">
            <Sparkles size={18} /> PROCESSING INTELLIGENCE...
          </div>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="flex gap-4 flex-wrap mb-6">
          <button onClick={() => handleSend('解释信号原因')} className="text-xs px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-text-main hover:bg-white/10 transition-all font-black uppercase tracking-widest">💡 信号解释</button>
          <button onClick={() => handleSend('今日市场热点')} className="text-xs px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-text-main hover:bg-white/10 transition-all font-black uppercase tracking-widest">📰 市场内参</button>
          <button
            onClick={() => {
              setInput('');
              setIsTyping(false);
              // 清空后重新同步上下文（保持体验一致）
              fetchNewsAndGreet(true);
            }}
            className="text-xs px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-text-main hover:bg-white/10 transition-all font-black uppercase tracking-widest"
          >
            🧹 清空对话
          </button>
        </div>
        <div className="relative group/input">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="在此咨询个股详情..." 
            disabled={isTyping}
            className="w-full bg-black/60 border-2 border-white/10 rounded-2xl p-6 text-base outline-none focus:border-white/30 transition-all pr-20 text-white font-bold hover:border-white/20 shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isTyping}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTerminal;
