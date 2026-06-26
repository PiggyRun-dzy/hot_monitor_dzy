import { useState, useRef, useEffect } from 'react';

export default function NotificationBell({ unreadCount, recentHotspots, onClearAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T') + 'Z');
      const mins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return '刚刚';
      if (mins < 60) return `${mins}分钟前`;
      return `${Math.floor(mins / 60)}小时前`;
    } catch { return ''; }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="neo-btn neo-btn-ghost text-xs py-1 px-2 flex items-center gap-1 relative"
        title="新热点通知"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={unreadCount > 0 ? 'text-accent-primary' : 'text-zinc-400'}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] rounded-xl border border-white/[0.08] shadow-2xl z-[999] animate-fade-in"
          style={{ background: '#0F0F1A', backdropFilter: 'none' }}>
          <div className="flex items-center justify-between p-3 pb-2">
            <span className="text-xs font-mono text-zinc-400">
              🔥 新热点通知 {unreadCount > 0 && `(${unreadCount})`}
            </span>
            <div className="flex items-center gap-2">
              {recentHotspots.length > 0 && (
                <button onClick={onClearAll} className="text-[10px] text-zinc-500 hover:text-zinc-300">
                  清除全部
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto custom-scroll">
            {recentHotspots.length === 0 ? (
              <div className="px-3 pb-4 text-center">
                <p className="text-zinc-600 text-xs">暂无新热点通知</p>
                <p className="text-zinc-700 text-[10px] mt-1">新热点被捕获后将自动在此显示</p>
              </div>
            ) : (
              <div className="space-y-0.5 pb-2">
                {recentHotspots.map(h => (
                  <a key={h.id} href={h.url || '#'} target={h.url ? '_blank' : undefined} rel="noopener noreferrer"
                    className="block px-3 py-2 hover:bg-white/[0.04] transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-300 group-hover:text-accent-primary transition-colors line-clamp-1">
                          {h.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {h.keyword && (
                            <span className="keyword-tag text-[9px]">{h.keyword}</span>
                          )}
                          {h.source_name && (
                            <span className="text-[10px] text-zinc-600">{h.source_name}</span>
                          )}
                          <span className="text-[10px] text-zinc-600">{timeAgo(h.detected_at)}</span>
                          {!h.notified && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          )}
                        </div>
                      </div>
                      {((h.relevance_score || 0) + (h.importance || 0) + (h.freshness || 0) > 0) && (
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {Math.round(((h.relevance_score || 0) + (h.importance || 0) + (h.freshness || 0)) / 3)}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
