import { useState } from 'react';
import HotspotCard from './HotspotCard';
import FilterBar from './FilterBar';

export default function HotspotFeed({ hotspots, keywords, sortField, sortOrder, filters, page, totalPages, totalCount, loading, onSortChange, onFilterChange, onPageChange }) {
  const [expandAll, setExpandAll] = useState(null); // null = individual control, true = all expanded, false = all collapsed
  const hasAnyReason = hotspots.some(h => h.ai_reason);

  const toggleExpandAll = () => {
    if (expandAll === true) {
      setExpandAll(false); // collapse all
    } else if (expandAll === false || expandAll === null) {
      setExpandAll(true); // expand all
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-alert"></span>
          热点信号流
          {totalCount > 0 && <span className="text-xs font-mono text-zinc-500 font-normal">{totalCount} 条</span>}
        </h2>
        {hasAnyReason && (
          <button
            onClick={toggleExpandAll}
            className="text-[10px] text-zinc-500 hover:text-accent-primary transition-colors font-mono"
          >
            {expandAll === true ? '折叠全部AI分析 ▲' : '展开全部AI分析 ▾'}
          </button>
        )}
      </div>

      <FilterBar
        sortField={sortField}
        sortOrder={sortOrder}
        filters={filters}
        keywords={keywords || []}
        onSortChange={onSortChange}
        onFilterChange={onFilterChange}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      ) : hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-700">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-full border border-accent-primary/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full border border-accent-primary/15" />
            <div className="absolute inset-[14px] rounded-full bg-accent-primary/5" />
          </div>
          <p className="text-sm">等待热点信号…</p>
          <p className="text-xs mt-1 text-zinc-600">添加关键词后自动监测</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 pr-0.5">
            {hotspots.map((hs, i) => (
              <HotspotCard key={hs.id} hotspot={hs} index={i} expandAll={expandAll} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
              <span className="text-xs text-zinc-600 font-mono">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={page <= 1}
                  className="pagination-btn"
                  title="首页"
                >
                  ««
                </button>
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  className="pagination-btn"
                  title="上一页"
                >
                  ‹
                </button>
                {getPageNumbers(page, totalPages).map((n, i) =>
                  n === '...' ? (
                    <span key={`dots-${i}`} className="text-xs text-zinc-600 px-1">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => onPageChange(n)}
                      className={`pagination-num ${n === page ? 'pagination-num-active' : ''}`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="pagination-btn"
                  title="下一页"
                >
                  ›
                </button>
                <button
                  onClick={() => onPageChange(totalPages)}
                  disabled={page >= totalPages}
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

function getPageNumbers(current, total) {
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
