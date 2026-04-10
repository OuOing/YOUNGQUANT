import React, { useState, useEffect } from 'react';

const MAX_CHARS = 2000;

/**
 * NoteEditor — 笔记编辑器组件
 * Props: { symbol, token, onClose }
 */
const NoteEditor = ({ symbol, token, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const charCount = [...content].length;
  const overLimit = charCount > MAX_CHARS;

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchNotes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notes${symbol ? `?symbol=${symbol}` : ''}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  useEffect(() => { fetchNotes(); }, [symbol, token]);

  const handleSave = async () => {
    if (!token) { setError('请先登录后再保存笔记'); return; }
    if (overLimit || !content.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (editingId) {
        await fetch(`/api/notes/${editingId}`, { method: 'PUT', headers, body: JSON.stringify({ content }) });
      } else {
        await fetch('/api/notes', { method: 'POST', headers, body: JSON.stringify({ content, symbol: symbol || '' }) });
      }
      setContent(''); setEditingId(null);
      await fetchNotes();
    } catch { setError('保存失败，请重试'); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!token) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE', headers });
    await fetchNotes();
  };

  if (!token) {
    return (
      <div className="p-4 text-center text-white/40 text-sm">
        <p>请先登录后使用笔记功能</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative">
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-teal-500/50 min-h-[100px]"
          placeholder={`记录关于 ${symbol || '当前股票'} 的想法...`}
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <span className={`absolute bottom-2 right-3 text-[10px] ${overLimit ? 'text-red-400' : 'text-white/30'}`}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || overLimit || !content.trim()}
          className="flex-1 py-2 bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-black rounded-xl disabled:opacity-40 hover:bg-teal-500/30 transition-all"
        >
          {loading ? '保存中...' : editingId ? '更新笔记' : '保存笔记'}
        </button>
        {editingId && (
          <button onClick={() => { setEditingId(null); setContent(''); }} className="px-4 py-2 bg-white/5 text-white/40 text-xs rounded-xl">
            取消
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {notes.map(note => (
          <div key={note.id} className="bg-white/5 border border-white/5 rounded-xl p-3">
            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-white/20">{note.created_at?.slice(0, 10)}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(note.id); setContent(note.content); }} className="text-[10px] text-teal-400/60 hover:text-teal-400">编辑</button>
                <button onClick={() => handleDelete(note.id)} className="text-[10px] text-red-400/60 hover:text-red-400">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteEditor;
