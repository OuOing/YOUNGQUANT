import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';

/**
 * Quiz — 知识模块小测验
 * Props: { moduleKey, onPass, onClose }
 */
const Quiz = ({ moduleKey, quizData, onPass, onClose }) => {
  const quiz = quizData[moduleKey];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // [{correct: bool}]
  const [showResult, setShowResult] = useState(false);

  if (!quiz) return null;

  const q = quiz.questions[current];
  const isLast = current === quiz.questions.length - 1;
  const correctCount = answers.filter(a => a.correct).length;
  const passed = correctCount >= 2;

  const handleSelect = (idx) => {
    if (selected !== null) return; // 已选过
    setSelected(idx);
  };

  const handleNext = () => {
    const correct = selected === q.answer;
    const newAnswers = [...answers, { correct, selected }];
    setAnswers(newAnswers);

    if (isLast) {
      setShowResult(true);
      if (newAnswers.filter(a => a.correct).length >= 2) {
        onPass?.();
      }
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          {passed
            ? <CheckCircle2 size={32} className="text-green-400" />
            : <XCircle size={32} className="text-red-400" />
          }
        </div>
        <div className="text-center">
          <p className={`text-lg font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {passed ? '测验通过！' : '再试一次'}
          </p>
          <p className="text-sm text-white/50 mt-1">
            答对 {correctCount}/{quiz.questions.length} 题
            {passed ? '，本模块已完成 ✓' : '，需答对 2 题以上才算通过'}
          </p>
        </div>

        {/* 答题回顾 */}
        <div className="w-full flex flex-col gap-2">
          {quiz.questions.map((q, i) => {
            const ans = answers[i];
            return (
              <div key={i} className={`p-3 rounded-xl border text-xs ${ans?.correct ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-2">
                  {ans?.correct
                    ? <CheckCircle2 size={13} className="text-green-400 shrink-0 mt-0.5" />
                    : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="text-white/70 mb-1">{q.q}</p>
                    {!ans?.correct && (
                      <p className="text-[10px] text-white/40">正确答案：{q.options[q.answer]}</p>
                    )}
                    <p className="text-[10px] text-white/30 mt-0.5">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 w-full">
          {!passed && (
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-white/60 text-xs font-black rounded-xl hover:text-white transition-all"
            >
              <RotateCcw size={13} /> 重新测验
            </button>
          )}
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${passed ? 'bg-secondary text-black hover:brightness-110' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}
          >
            {passed ? '继续学习 →' : '关闭'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 进度 */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">{quiz.title}</p>
        <div className="flex gap-1">
          {quiz.questions.map((_, i) => (
            <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i < current ? 'bg-secondary' : i === current ? 'bg-secondary/60' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      {/* 题目 */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <p className="text-sm font-black text-white leading-relaxed">{q.q}</p>
      </div>

      {/* 选项 */}
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          let style = 'bg-white/5 border-white/8 text-white/60 hover:border-white/20 hover:text-white cursor-pointer';
          if (selected !== null) {
            if (i === q.answer) style = 'bg-green-500/10 border-green-500/30 text-green-400';
            else if (i === selected && selected !== q.answer) style = 'bg-red-500/10 border-red-500/30 text-red-400';
            else style = 'bg-white/[0.02] border-white/5 text-white/30';
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium text-left transition-all ${style}`}
            >
              <span className="w-5 h-5 rounded-lg border border-current flex items-center justify-center text-[10px] font-black shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* 解析 */}
      {selected !== null && (
        <div className={`p-3 rounded-xl text-xs leading-relaxed ${selected === q.answer ? 'bg-green-500/5 border border-green-500/20 text-green-300/80' : 'bg-red-500/5 border border-red-500/20 text-red-300/80'}`}>
          {q.explanation}
        </div>
      )}

      {/* 下一题 */}
      {selected !== null && (
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-2 py-2.5 bg-secondary text-black font-black text-xs rounded-xl hover:brightness-110 transition-all"
        >
          {isLast ? '查看结果' : '下一题'}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};

export default Quiz;
