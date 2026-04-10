import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const HelpTooltip = ({ text, title }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = React.useRef(null);

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
    setIsVisible(true);
  };

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center ml-1.5 align-middle cursor-help group"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <HelpCircle size={13} className="text-white/30 group-hover:text-secondary transition-all duration-300" />

      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[99999] w-64 p-3 bg-[#0a0a0b] border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
          style={{ top: pos.top - 8, left: pos.left, transform: 'translate(-50%, -100%)' }}
        >
          {title && (
            <div className="text-[9px] font-black text-white/90 uppercase tracking-[0.2em] mb-1.5 border-b border-white/5 pb-1.5">{title}</div>
          )}
          <div className="text-[11px] font-medium text-white/60 leading-relaxed">{text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#0a0a0b]" />
        </div>,
        document.body
      )}
    </div>
  );
};

export default HelpTooltip;
