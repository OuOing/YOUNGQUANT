import React from 'react';

// 基础骨架块
export const SkeletonBlock = ({ className = '' }) => (
  <div className={`bg-white/5 rounded-xl animate-pulse ${className}`} />
);

// 卡片骨架
export const SkeletonCard = ({ lines = 3 }) => (
  <div className="section-card p-5 flex flex-col gap-3">
    <SkeletonBlock className="h-4 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

// 表格行骨架
export const SkeletonRow = ({ cols = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-4 px-4 border-b border-white/5">
        <div className="h-4 bg-white/5 rounded-lg" style={{ width: `${60 + Math.random() * 40}%` }} />
      </td>
    ))}
  </tr>
);

// 资产卡片骨架
export const SkeletonPortfolio = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="flex flex-col gap-2">
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="h-10 w-40" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <SkeletonBlock className="h-2.5 w-16 mb-2" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
      ))}
    </div>
  </div>
);

// 聊天消息骨架
export const SkeletonChat = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    {[1,2,3].map(i => (
      <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-7 h-7 rounded-xl bg-white/5 shrink-0" />
        <div className={`flex flex-col gap-1.5 max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
          {i === 1 && <SkeletonBlock className="h-3 w-3/5" />}
        </div>
      </div>
    ))}
  </div>
);

export default SkeletonBlock;
