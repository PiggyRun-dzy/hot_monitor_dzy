import { useState, useCallback } from 'react';
import HotspotCard from './HotspotCard';
import FilterBar from './FilterBar';

const DEFAULT_FILTERS = {
  time: 'all', sources: [], keywordIds: [],
  scoreMin: '', scoreMax: '',
  rMin: '', rMax: '', iMin: '', iMax: '', fMin: '', fMax: '',
  aiVerified: 'all', sourceType: 'all', notified: 'all'
};

function buildApiParams(query, sortField, sortOrder, filters) {
  const params = new URLSearchParams();
  params.set('limit', '200');
  params.set('sort', sortField);
  params.set('order', sortOrder);
  if (filters.time && filters.time !== 'all') params.set('time', filters.time);
  if (filters.sources?.length > 0) params.set('source', filters.sources.join(','));
  if (filters.keywordIds?.length > 0) params.set('keyword_id', filters.keywordIds.join(','));
  if (filters.scoreMin !== '') params.set('score_min', filters.scoreMin);
  if (filters.scoreMax !== '') params.set('score_max', filters.scoreMax);
  if (filters.rMin !== '') params.set('r_min', filters.rMin);
  if (filters.rMax !== '') params.set('r_max', filters.rMax);
  if (filters.iMin !== '') params.set('i_min', filters.iMin);
  if (filters.iMax !== '') params.set('i_max', filters.iMax);
  if (filters.fMin !== '') params.set('f_min', filters.fMin);
  if (filters.fMax !== '') params.set('f_max', filters.fMax);
  if (filters.aiVerified !== 'all') params.set('ai_verified', filters.aiVerified);
  if (filters.sourceType !== 'all') params.set('source_type', filters.sourceType);
  if (filters.notified !== 'all') params.set('status', filters.notified === '1' ? 'notified' : 'unread');
  return params.toString();
}

export default function SearchPanel({ api, keywords }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortField, setSortField] = useState('detected_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchPage, setSearchPage] = useState(1);
  const [expandAll, setExpandAll] = useState(null);
  const SEARCH_PAGE_SIZE = 15;

  const search = useCallback(async (pageNum = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const qs = buildApiParams(query, sortField, sortOrder, filters);
      const data = await api(`/api/hotspots?${qs}`);
      const items = data.data || [];
      const q = query.trim().toLowerCase();
      const filtered = items.filter(h =>
        (h.title && h.title.toLowerCase().includes(q)) ||
        (h.keyword && h.keyword.toLowerCase().includes(q)) ||
        (h.summary && h.summary.toLowerCase().includes(q))
      );
      setResults(filtered);
      setSearchPage(pageNum);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [query, api, sortField, sortOrder, filters]);

  const handleKeyDown = e => { if (e.key === 'Enter') search(); };

  const handleSortChange = (field, order) => {
    setSortField(field);
    setSortOrder(order);
  };

  const handleFilterChange = (next) => {
    setFilters(next);
  };

  const totalSearchResults = results.length;
  const totalSearchPages = Math.ceil(totalSearchResults / SEARCH_PAGE_SIZE);
  const paginatedResults = results.slice((searchPage - 1) * SEARCH_PAGE_SIZE, searchPage * SEARCH_PAGE_SIZE);
  const hasAnyReason = paginatedResults.some(h => h.ai_reason);

  const toggleExpandAll = () => {
    if (expandAll === true) setExpandAll(false);
    else setExpandAll(true);
  };

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
        <button onClick={() => search(1)} disabled={loading || !query.trim()}
          className="neo-btn neo-btn-primary text-xs disabled:opacity-40">
          {loading ? '搜索中…' : '搜索'}
        </button>
      </div>

      <FilterBar
        sortField={sortField}
        sortOrder={sortOrder}
        filters={filters}
        keywords={keywords || []}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />

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
      ) : totalSearchResults === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
          <p className="text-sm">未找到匹配的热点</p>
          <p className="text-xs mt-1">尝试其他关键词</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mt-3 mb-3">
            <p className="text-xs text-zinc-500">
              找到 {totalSearchResults} 条结果
              {totalSearchPages > 1 && <span className="ml-2">（第 {searchPage}/{totalSearchPages} 页）</span>}
            </p>
            {hasAnyReason && (
              <button
                onClick={toggleExpandAll}
                className="text-[10px] text-zinc-500 hover:text-accent-primary transition-colors font-mono"
              >
                {expandAll === true ? '折叠全部AI分析 ▲' : '展开全部AI分析 ▾'}
              </button>
            )}
          </div>
          <div className="space-y-2 pr-0.5">
            {paginatedResults.map((hs, i) => (
              <HotspotCard key={hs.id} hotspot={hs} index={i} expandAll={expandAll} />
            ))}
          </div>
          {totalSearchPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
              <span className="text-xs text-zinc-600 font-mono">
                共 {totalSearchResults} 条
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => search(1)}
                  disabled={searchPage <= 1}
                  className="pagination-btn"
                  title="首页"
                >
                  ««
                </button>
                <button
                  onClick={() => search(searchPage - 1)}
                  disabled={searchPage <= 1}
                  className="pagination-btn"
                  title="上一页"
                >
                  ‹
                </button>
                {getSearchPageNumbers(searchPage, totalSearchPages).map((n, i) =>
                  n === '...' ? (
                    <span key={`dots-${i}`} className="text-xs text-zinc-600 px-1">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => search(n)}
                      className={`pagination-num ${n === searchPage ? 'pagination-num-active' : ''}`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => search(searchPage + 1)}
                  disabled={searchPage >= totalSearchPages}
                  className="pagination-btn"
                  title="下一页"
                >
                  ›
                </button>
                <button
                  onClick={() => search(totalSearchPages)}
                  disabled={searchPage >= totalSearchPages}
                  className="pagination-btn"
                  title="末页"
                >
                  »»
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getSearchPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
