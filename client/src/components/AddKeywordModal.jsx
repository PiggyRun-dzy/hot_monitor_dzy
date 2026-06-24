import { useState } from 'react';

export default function AddKeywordModal({ onClose, onAdd }) {
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    const ok = await onAdd(keyword.trim(), scope.trim());
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-100">添加监控关键词</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-mono">KEYWORD</label>
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="输入要监控的关键词…" className="neo-input w-full" autoFocus required />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">范围（可选）</label>
            <input type="text" value={scope} onChange={e => setScope(e.target.value)}
              placeholder="例如：AI 编程、大模型…" className="neo-input w-full" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 neo-btn neo-btn-ghost justify-center py-2.5">取消</button>
            <button type="submit" disabled={loading || !keyword.trim()}
              className="flex-1 neo-btn neo-btn-primary justify-center py-2.5 disabled:opacity-40">
              {loading ? '添加中…' : '开始监控'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
