export default function HotspotCard({ hotspot, index }) {
  const scoreClass = hotspot.relevance_score >= 80
    ? 'score-high'
    : hotspot.relevance_score >= 60
      ? 'score-mid'
      : 'score-low';

  const timeAgo = getTimeAgo(hotspot.detected_at);

  return (
    <a
      href={hotspot.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-cyber-border bg-cyber-panel/50 hover:border-cyber-cyan/30 hover:bg-cyber-panel/80 transition-all duration-300 group animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Score ring */}
        <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor"
              className="text-cyber-border" strokeWidth="3" />
            <circle cx="20" cy="20" r="16" fill="none"
              stroke={hotspot.relevance_score >= 80 ? '#22C55E' : hotspot.relevance_score >= 60 ? '#F59E0B' : '#EF4444'}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(hotspot.relevance_score / 100) * 100.5} 100.5`}
              className="transition-all duration-500" />
          </svg>
          <span className={`absolute text-[10px] font-bold font-mono ${
            hotspot.relevance_score >= 80 ? 'text-cyber-green' : hotspot.relevance_score >= 60 ? 'text-cyber-amber' : 'text-red-400'
          }`}>
            {hotspot.relevance_score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-hud-text group-hover:text-cyber-cyan transition-colors truncate">
              {hotspot.title}
            </h4>
            {!hotspot.notified && (
              <span className="notify-dot shrink-0" />
            )}
          </div>

          {hotspot.summary && (
            <p className="text-xs text-hud-dim line-clamp-2 mb-2">
              {hotspot.summary}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`score-badge ${scoreClass}`}>
              {hotspot.relevance_score >= 80 ? '高相关' : hotspot.relevance_score >= 60 ? '中相关' : '低相关'}
            </span>
            <span className="text-[10px] font-mono bg-cyber-purple/10 text-cyber-purple px-1.5 py-0.5 rounded">
              {hotspot.keyword}
            </span>
            {hotspot.source_name && (
              <span className="text-[10px] text-hud-dim">
                via {hotspot.source_name}
              </span>
            )}
            <span className="text-[10px] text-hud-dim ml-auto">
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr);
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
