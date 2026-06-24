import { useState, useEffect, useRef } from 'react';

export default function LogPopover({ api }) {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    try { const data = await api('/api/logs'); setLogs(data || []); } catch { }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onMouseEnter={() => { if (!open && !logs.length) fetchLogs(); }}
        onClick={() => { setOpen(!open); if (!open && !logs.length) fetchLogs(); }}
        className="neo-btn neo-btn-ghost text-xs py-1 px-2 flex items-center gap-1" title="系统日志">
        <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="hidden sm:inline">日志</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/[0.08] shadow-2xl p-3 z-[999] animate-fade-in"
          style={{ background: '#0F0F1A', backdropFilter: 'none' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400">系统日志 ({logs.length})</span>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
          </div>
          <div className="terminal-log max-h-60 overflow-y-auto custom-scroll space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">暂无日志</p>
            ) : (
              logs.slice(-20).reverse().map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="log-time shrink-0">{new Date(l.created_at).toLocaleTimeString('zh-CN', { hour12: false })}</span>
                  <span className={l.type === 'cycle' ? 'log-ok' : 'log-info'}>{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
