import { useState, useCallback } from 'react';
import HotspotCard from './HotspotCard';

export default function SearchPanel({ api }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Fetch all hotspots, filter client-side (small dataset, fast)
      const data = await api(`/api/hotspots?limit=200`);
      const items = data.data || [];
      const q = query.trim().toLowerCase();
      const filtered = items.filter(h =>
        (h.title && h.title.toLowerCase().includes(q)) ||
        (h.keyword && h.keyword.toLowerCase().includes(q)) ||
        (h.summary && h.summary.toLowerCase().includes(q))
      );
      setResults(filtered.slice(0, 30));
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [query, api]);

  const handleKeyDown = e => { if (e.key === 'Enter') search(); };

  return (
    <div className="glass-card p-4">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="搜索标题、关键词、摘要…"
            className="neo-input w-full pl-9"
            autoFocus
          />
        </div>
        <button onClick={search} disabled={loading || !query.trim()}
          className="neo-btn neo-btn-primary text-xs disabled:opacity-40">
          {loading ? '搜索中…' : '搜索'}
        </button>
      </div>

      {/* Results */}
      {!searched ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-700">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">搜索历史热点</p>
          <p className="text-xs mt-1 text-zinc-600">输入关键词查找已发现的热点</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
          <p className="text-sm">未找到匹配的热点</p>
          <p className="text-xs mt-1">尝试其他关键词</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500 mb-3">找到 {results.length} 条结果</p>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll pr-0.5">
            {results.map((hs, i) => (
              <HotspotCard key={hs.id} hotspot={hs} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
