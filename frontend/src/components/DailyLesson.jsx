import React, { useState, useEffect } from 'react';

const CATEGORY_COLORS = {
  '技术分析': { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  '基本面分析': { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  '交易心理': { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  '风险管理': { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
};

const DailyLesson = ({ token }) => {
  const [lesson, setLesson] = useState(null);
  const [read, setRead] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch('/api/learning/daily-lesson')
      .then(r => r.json())
      .then(data => {
        if (data.lesson) setLesson(data.lesson);
      })
      .catch(() => {});

    // 计算连续学习天数（本地存储）
    const today = new Date().toISOString().slice(0, 10);
    const lastRead = localStorage.getItem('yq_last_lesson_date');
    const streakCount = parseInt(localStorage.getItem('yq_lesson_streak') || '0');
    if (lastRead === today) {
      setRead(true);
      setStreak(streakCount);
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setStreak(lastRead === yesterday ? streakCount : 0);
    }
  }, []);

  const handleRead = async () => {
    if (!lesson || read) return;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastRead = localStorage.getItem('yq_last_lesson_date');
    const prevStreak = parseInt(localStorage.getItem('yq_lesson_streak') || '0');
    const newStreak = lastRead === yesterday ? prevStreak + 1 : 1;

    localStorage.setItem('yq_last_lesson_date', today);
    localStorage.setItem('yq_lesson_streak', String(newStreak));
    setStreak(newStreak);
    setRead(true);

    if (token) {
      fetch('/api/learning/daily-lesson/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lesson_id: lesson.id }),
      }).catch(() => {});
    }
  };

  if (!lesson) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-pulse">
        <div className="h-3 w-20 bg-white/10 rounded mb-2" />
        <div className="h-4 w-48 bg-white/10 rounded mb-2" />
        <div className="h-3 w-full bg-white/5 rounded" />
      </div>
    );
  }

  const colors = CATEGORY_COLORS[lesson.category] || CATEGORY_COLORS['技术分析'];

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${colors.border} ${colors.bg}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>{lesson.category}</span>
          <span className="text-[9px] text-white/20">·</span>
          <span className="text-[9px] text-white/30">今日课堂 DAY {lesson.day_index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <span className="text-[10px]">🔥</span>
              <span className="text-[9px] font-black text-orange-400">{streak}天连续</span>
            </div>
          )}
          {read && <span className="text-[9px] text-green-400 font-black">✓ 已读</span>}
        </div>
      </div>

      {/* 内容 */}
      <div className="px-4 pb-3">
        <h4 className="text-sm font-black text-white mb-1.5">{lesson.title}</h4>
        <p className={`text-xs text-white/60 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
          {lesson.content}
        </p>

        {/* 操作栏 */}
        <div className="flex items-center gap-3 mt-2.5">
          {lesson.content?.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-[10px] font-black ${colors.text} hover:opacity-80 transition-opacity`}
            >
              {expanded ? '收起 ↑' : '展开阅读 ↓'}
            </button>
          )}
          {lesson.detail_module && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('yq:navigate', { detail: { page: 'learning', module: lesson.detail_module } }));
              }}
              className="text-[10px] text-white/30 hover:text-white transition-colors"
            >
              深入学习 →
            </button>
          )}
          {!read && (
            <button
              onClick={handleRead}
              className={`ml-auto text-[9px] font-black px-2.5 py-1 rounded-lg border ${colors.border} ${colors.text} hover:opacity-80 transition-opacity`}
            >
              标记已读
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyLesson;
