import { useState } from 'react';

export default function KeywordManager({ keywords, onAdd, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(null);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
          监控频道
          {keywords.length > 0 && <span className="text-xs font-mono text-zinc-500 font-normal">{keywords.filter(k => k.status === 'active').length} 活跃</span>}
        </h2>
        <button onClick={onAdd} className="neo-btn neo-btn-primary text-xs py-1.5 px-3">+ 添加</button>
      </div>

      <div className="space-y-0.5 max-h-[520px] overflow-y-auto custom-scroll pr-0.5">
        {keywords.length === 0 ? (
          <div className="text-center py-10 text-zinc-600">
            <p className="text-2xl mb-1.5">📡</p>
            <p className="text-sm">暂无关键词</p>
            <p className="text-xs mt-1">点击添加，开始监测</p>
          </div>
        ) : (
          keywords.map(kw => (
            <div key={kw.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                kw.status === 'active' ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'opacity-50 bg-transparent hover:bg-white/[0.02]'
              }`}>
              {/* Toggle switch — green when active */}
              <button onClick={() => onToggle(kw.id, kw.status)}
                className="relative shrink-0 rounded-full transition-colors duration-200"
                style={{
                  width: '40px', height: '22px', minWidth: '40px',
                  backgroundColor: kw.status === 'active' ? 'rgba(52,211,153,0.5)' : 'rgba(63,63,70,0.8)',
                }}
                title={kw.status === 'active' ? '暂停监控' : '开启监控'}>
                <span className="absolute rounded-full bg-white shadow-sm transition-all duration-200"
                  style={{
                    width: '16px', height: '16px', top: '3px',
                    left: kw.status === 'active' ? '21px' : '3px',
                  }} />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 ml-1">
                <span className="text-sm text-zinc-300 truncate block leading-5">{kw.keyword}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {kw.scope && <span className="keyword-tag">{kw.scope}</span>}
                  <span className="text-[10px] text-zinc-600">🔥 {kw.hotspot_count || 0}</span>
                </div>
              </div>

              {/* Actions — always visible */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(kw)} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-white/[0.06] transition-colors" title="编辑">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button onClick={() => onDelete(kw.id)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-white/[0.06] transition-colors" title="删除">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <EditModal kw={editing} onClose={() => setEditing(null)} onSave={(kw, scope) => { onUpdate(editing.id, kw, scope); setEditing(null); }} />
      )}
    </div>
  );
}

function EditModal({ kw, onClose, onSave }) {
  const [keyword, setKeyword] = useState(kw.keyword);
  const [scope, setScope] = useState(kw.scope || '');
  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel animate-fade-up">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">编辑关键词</h2>
        <div className="space-y-3">
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} className="neo-input w-full" autoFocus />
          <input type="text" value={scope} onChange={e => setScope(e.target.value)} placeholder="范围（可选）" className="neo-input w-full" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 neo-btn neo-btn-ghost justify-center py-2.5">取消</button>
          <button onClick={() => onSave(keyword.trim(), scope.trim())} disabled={!keyword.trim()}
            className="flex-1 neo-btn neo-btn-primary justify-center py-2.5 disabled:opacity-40">保存</button>
        </div>
      </div>
    </div>
  );
}
