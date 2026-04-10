import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

const TASKS = [
  {
    id: 'view_chart',
    label: '查看 K 线图',
    desc: '观察股票价格走势，认识 MA5/MA20 均线',
    storageKey: 'yq_task_view_chart',
    autoCheck: true, // 进入页面自动完成
  },
  {
    id: 'ask_ai',
    label: '向 AI 提问',
    desc: '在右侧对话框问一个关于股票的问题',
    storageKey: 'yq_task_ask_ai',
  },
  {
    id: 'first_trade',
    label: '完成第一笔交易',
    desc: '买入任意股票，体验模拟交易流程',
    storageKey: 'yq_first_trade_done',
  },
  {
    id: 'read_lesson',
    label: '阅读今日课堂',
    desc: '点击"标记已读"完成今天的学习',
    storageKey: 'yq_last_lesson_date',
    checkFn: () => localStorage.getItem('yq_last_lesson_date') === new Date().toISOString().slice(0, 10),
  },
  {
    id: 'check_portfolio',
    label: '查看资产明细',
    desc: '点击"资产"标签页查看持仓和历史成交',
    storageKey: 'yq_task_check_portfolio',
  },
];

const NewUserChecklist = ({ onNavigate }) => {
  const [tasks, setTasks] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 自动完成"查看K线图"
    if (!localStorage.getItem('yq_task_view_chart')) {
      localStorage.setItem('yq_task_view_chart', '1');
    }

    const updated = TASKS.map(t => ({
      ...t,
      done: t.checkFn ? t.checkFn() : !!localStorage.getItem(t.storageKey),
    }));
    setTasks(updated);

    // 如果全部完成，自动收起
    if (updated.every(t => t.done)) {
      setCollapsed(true);
    }

    // 检查是否已关闭
    if (localStorage.getItem('yq_checklist_dismissed')) {
      setDismissed(true);
    }
  }, []);

  // 监听 localStorage 变化（交易完成等）
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => ({
        ...t,
        done: t.checkFn ? t.checkFn() : !!localStorage.getItem(t.storageKey),
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;

  const doneCount = tasks.filter(t => t.done).length;
  const allDone = doneCount === tasks.length;
  const pct = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  if (allDone && collapsed) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-xs font-black text-green-400">新手任务全部完成！你已掌握平台基础操作</span>
        </div>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem('yq_checklist_dismissed', '1'); }}
          className="text-[10px] text-white/30 hover:text-white"
        >
          关闭
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-all"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-white/60">新手任务</span>
            <span className="text-[9px] text-white/30">{doneCount}/{tasks.length}</span>
          </div>
          {/* 进度条 */}
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-secondary font-black">{Math.round(pct)}%</span>
          {collapsed ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
        </div>
      </div>

      {/* 任务列表 */}
      {!collapsed && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 px-4 py-2.5 transition-all ${task.done ? 'opacity-50' : 'hover:bg-white/5'}`}>
              {task.done
                ? <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                : <Circle size={15} className="text-white/20 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black ${task.done ? 'line-through text-white/40' : 'text-white/80'}`}>
                  {task.label}
                </p>
                <p className="text-[10px] text-white/30 truncate">{task.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewUserChecklist;
