import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { identifyTerms, queryTerm } from '../lib/knowledgeBase.js';

/**
 * TermTooltip — 自动识别文本中的专业术语并展示悬浮解释卡片
 * Props:
 *   text: string — 要渲染的文本内容
 */
const TermTooltip = ({ text }) => {
  const [tooltip, setTooltip] = useState(null); // { term, definition, usage, related_terms, x, y }
  const timerRef = useRef(null);

  const handleMouseEnter = useCallback((term, e) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const info = queryTerm(term);
      if (!info) return;
      const rect = e.target.getBoundingClientRect();
      // fixed 定位直接用 viewport 坐标，不加 scrollY
      setTooltip({
        term, ...info,
        x: Math.min(rect.left, window.innerWidth - 320),
        y: rect.bottom + 6,
      });
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 100);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClick = useCallback((term, e) => {
    const info = queryTerm(term);
    if (!info) return;
    const rect = e.target.getBoundingClientRect();
    setTooltip(prev =>
      prev?.term === term ? null : {
        term, ...info,
        x: Math.min(rect.left, window.innerWidth - 320),
        y: rect.bottom + 6,
      }
    );
  }, []);

  if (!text || typeof text !== 'string') return <span>{text}</span>;

  const matches = identifyTerms(text);
  if (matches.length === 0) return <span>{text}</span>;

  const segments = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) segments.push({ type: 'text', content: text.slice(cursor, m.start) });
    segments.push({ type: 'term', content: m.term });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ type: 'text', content: text.slice(cursor) });

  return (
    <>
      <span>
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <span key={i}>{seg.content}</span>
          ) : (
            <span
              key={i}
              className="underline decoration-dotted decoration-teal-400/60 cursor-help text-teal-300/90 hover:text-teal-300 transition-colors"
              onMouseEnter={(e) => handleMouseEnter(seg.content, e)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(seg.content, e)}
            >
              {seg.content}
            </span>
          )
        )}
      </span>

      {/* Portal tooltip — 渲染到 body，彻底脱离父级 stacking context */}
      {tooltip && createPortal(
        <div
          className="fixed z-[99999] bg-[#0f1117] border border-teal-500/30 rounded-xl p-3 shadow-2xl max-w-xs text-left animate-in fade-in zoom-in-95 duration-150"
          style={{ top: tooltip.y, left: tooltip.x }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <p className="text-xs font-black text-teal-400 mb-1">{tooltip.term}</p>
          <p className="text-xs text-white/70 leading-relaxed mb-1">{tooltip.definition}</p>
          <p className="text-[10px] text-white/40">{tooltip.usage}</p>
          {tooltip.related_terms?.length > 0 && (
            <p className="text-[10px] text-teal-500/60 mt-1">
              相关：{tooltip.related_terms.slice(0, 3).join('、')}
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default TermTooltip;
