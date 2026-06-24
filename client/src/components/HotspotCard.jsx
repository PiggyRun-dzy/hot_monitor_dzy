export default function HotspotCard({ hotspot, index }) {
  const score = hotspot.relevance_score || 0;
  const scoreColor = score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#F87171';
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (score / 100) * circumference;

  const timeAgo = getTimeAgo(hotspot.detected_at);

  return (
    <a href={hotspot.url} target="_blank" rel="noopener noreferrer"
      className="block group p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-accent-primary/20 hover:bg-white/[0.03] transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start gap-3">
        {/* Score ring */}
        <div className="score-ring">
          <svg viewBox="0 0 36 36">
            <circle className="track" cx="18" cy="18" r="14" />
            <circle className="fill" cx="18" cy="18" r="14" stroke={scoreColor}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset} />
          </svg>
          <span className="text" style={{ color: scoreColor }}>{score}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-zinc-200 group-hover:text-accent-glow transition-colors line-clamp-1">
              {hotspot.title}
            </h3>
            {!hotspot.notified && <span className="relative flex shrink-0"><span className="pulse-dot" style={{ background: '#F472B6' }} /></span>}
          </div>
          {hotspot.summary && (
            <p className="text-xs text-zinc-500 line-clamp-1 mb-1.5">{hotspot.summary}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`neo-badge ${score >= 80 ? 'neo-badge-high' : score >= 60 ? 'neo-badge-mid' : 'neo-badge-low'}`}>
              {score >= 80 ? '高相关' : score >= 60 ? '中相关' : '低相关'}
            </span>
            <span className="keyword-tag">{hotspot.keyword}</span>
            {hotspot.source_name && <span className="text-[10px] text-zinc-600">{hotspot.source_name}</span>}
            <span className="text-[10px] text-zinc-600 ml-auto">{timeAgo}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  // SQLite CURRENT_TIMESTAMP stores local time; treat as Asia/Shanghai
  const date = new Date(dateStr.replace(' ', 'T') + '+08:00');
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}
