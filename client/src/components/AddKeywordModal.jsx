import { useState } from 'react';

export default function AddKeywordModal({ onClose, onAdd }) {
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    const ok = await onAdd(keyword.trim(), scope.trim());
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-cyber-cyan">
            🎯 添加监控关键词
          </h2>
          <button onClick={onClose} className="text-hud-dim hover:text-cyber-pink transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-cyber-cyan mb-1.5">
              KEYWORD
            </label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="输入要监控的关键词..."
              className="cyber-input w-full px-3 py-2.5 rounded-lg text-sm font-mono"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-cyan mb-1.5">
              SCOPE (可选)
            </label>
            <input
              type="text"
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="例如: AI 编程、大模型、人工智能..."
              className="cyber-input w-full px-3 py-2.5 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cyber-input px-4 py-2.5 rounded-lg text-sm text-hud-dim hover:text-hud-text transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="flex-1 cyber-btn bg-cyber-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-cyber-purple/80 disabled:opacity-50 transition-all"
            >
              {loading ? '添加中...' : '🚀 开始监控'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-cyber-border">
          <p className="text-[10px] text-hud-dim font-mono">
            {`> 添加后系统会每30分钟自动搜索并AI验证相关内容`}
          </p>
        </div>
      </div>
    </div>
  );
}
