import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react';

/**
 * DraggableCard — 可拖拽、可调整高度的卡片容器
 * Props:
 *   id: string — 唯一标识，用于持久化位置
 *   defaultHeight: number — 默认高度(px)，0 = auto
 *   minHeight: number — 最小高度
 *   maxHeight: number — 最大高度
 *   title: ReactNode — 标题区域
 *   children: ReactNode
 *   className: string
 *   onDragStart/onDragEnd: 拖拽回调（用于父级排序）
 */
const DraggableCard = ({
  id,
  defaultHeight = 0,
  minHeight = 200,
  maxHeight = 1200,
  title,
  children,
  className = '',
  draggable = true,
  resizable = true,
}) => {
  const storageKey = `yq_card_h_${id}`;
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved) : defaultHeight;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);
  const startY = useRef(0);
  const startH = useRef(0);

  // 保存高度
  useEffect(() => {
    if (height > 0) localStorage.setItem(storageKey, String(height));
  }, [height, storageKey]);

  // 底部拖拽调整高度
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startH.current = cardRef.current?.offsetHeight || height || minHeight;

    const onMove = (ev) => {
      const delta = ev.clientY - startY.current;
      const newH = Math.max(minHeight, Math.min(maxHeight, startH.current + delta));
      setHeight(newH);
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [height, minHeight, maxHeight]);

  const toggleExpand = () => {
    if (expanded) {
      setExpanded(false);
      setHeight(startH.current || defaultHeight || minHeight);
    } else {
      startH.current = height || cardRef.current?.offsetHeight || minHeight;
      setExpanded(true);
      setHeight(maxHeight);
    }
  };

  const style = height > 0 ? { height: `${height}px` } : {};

  return (
    <div
      ref={cardRef}
      className={`section-card relative flex flex-col ${isResizing ? 'select-none' : ''} ${className}`}
      style={style}
    >
      {/* 拖拽手柄 + 展开按钮 */}
      {(draggable || resizable) && (
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {resizable && (
            <button
              onClick={toggleExpand}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all"
              title={expanded ? '收起' : '展开'}
            >
              {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          {draggable && (
            <div
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white cursor-grab active:cursor-grabbing transition-all"
              title="拖拽移动"
            >
              <GripVertical size={12} />
            </div>
          )}
        </div>
      )}

      {/* 内容 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>

      {/* 底部调整高度手柄 */}
      {resizable && height > 0 && (
        <div
          onMouseDown={onResizeStart}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center group/resize"
          title="拖拽调整高度"
        >
          <div className="w-8 h-0.5 bg-white/10 rounded-full group-hover/resize:bg-secondary/40 transition-colors" />
        </div>
      )}
    </div>
  );
};

export default DraggableCard;
