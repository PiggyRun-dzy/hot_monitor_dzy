import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

/**
 * Manages toast notifications. Call addToast(title, source) to show one.
 * Renders a fixed-position stack of toasts at top-right.
 */
export function useToastNotifications() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, source) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { id, title, source }]);
    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}

export default function NotificationToast({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-16 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t, i) => (
        <div key={t.id}
          className="pointer-events-auto animate-slide-in-right flex items-start gap-2.5 bg-[#1a1a2e] border border-white/[0.08] rounded-xl px-3.5 py-2.5 shadow-2xl max-w-[320px] cursor-pointer hover:border-accent-primary/30 transition-colors"
          style={{ animationDelay: `${i * 50}ms` }}
          onClick={() => onDismiss(t.id)}>
          <span className="text-sm shrink-0 mt-0.5">🔥</span>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-200 leading-snug line-clamp-2">{t.title}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{t.source} · 点击关闭</p>
          </div>
        </div>
      ))}
    </div>
  );
}
