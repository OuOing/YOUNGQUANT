import React from 'react';
import { LayoutDashboard, BookOpen, TrendingUp, User, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: '主页', icon: LayoutDashboard },
  { key: 'market',    label: '行情', icon: BarChart3 },
  { key: 'strategy',  label: '策略', icon: TrendingUp },
  { key: 'learning',  label: '学习', icon: BookOpen },
  { key: 'personal',  label: '我的', icon: User },
];

const MobileNav = ({ currentPage, onNavigate, user }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[150] md:hidden bg-bg-deep/95 backdrop-blur-xl border-t border-white/8 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = currentPage === key;
          // 个人中心需要登录
          const isPersonal = key === 'personal';
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[52px] ${
                active
                  ? 'text-secondary'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className={`relative ${active ? 'scale-110' : ''} transition-transform`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                {isPersonal && !user && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full" />
                )}
              </div>
              <span className={`text-[9px] font-black tracking-wide ${active ? 'text-secondary' : ''}`}>
                {label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-secondary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
