import { useState } from 'react';

const SUMMARY_MAX = 80; // chars before truncation in display

export default function HotspotCard({ hotspot, index, expandAll }) {
  const relevanceScore = hotspot.relevance_score || 0;
  const importance = hotspot.importance || 0;
  const freshness = hotspot.freshness || 0;
  const combinedScore = hotspot.combined_score ?? Math.round((relevanceScore + importance + freshness) / 3);
  const scoreColor = combinedScore >= 80 ? '#34D399' : combinedScore >= 60 ? '#FBBF24' : '#F87171';
  const scoreDot = combinedScore >= 80 ? 'bg-emerald-400' : combinedScore >= 60 ? 'bg-amber-400' : 'bg-red-400';
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (combinedScore / 100) * circumference;
  const timeAgo = getTimeAgo(hotspot.detected_at);
  const hasUrl = hotspot.url && /^https?:\/\//.test(hotspot.url);

  // Parse engagement JSON
  let engagement = {};
  try {
    engagement = typeof hotspot.engagement === 'string'
      ? JSON.parse(hotspot.engagement) : (hotspot.engagement || {});
  } catch { engagement = {}; }

  const hasEngagement = Object.keys(engagement).length > 0;
  const pubDate = hotspot.pub_date || '';
  const author = hotspot.author || '';
  const originalSnippet = hotspot.original_snippet || '';
  const aiSummary = hotspot.summary || '';
  const aiReason = hotspot.ai_reason || '';

  // Smart detection: is original snippet meaningful (not just stats)?
  const hasOriginalSnippet = isMeaningfulSnippet(originalSnippet);

  // AI summary truncation for display
  const summaryTruncated = aiSummary.length > SUMMARY_MAX;
  const displaySummary = summaryTruncated ? aiSummary.slice(0, SUMMARY_MAX) + '…' : aiSummary;

  // Independent expand states (for long content sections)
  const [originalExpanded, setOriginalExpanded] = useState(false);
  const [aiReasonExpanded, setAiReasonExpanded] = useState(false);

  // Global expandAll only controls AI reason
  const reasonExpanded = expandAll != null ? expandAll : aiReasonExpanded;
  const toggleAiReason = () => {
    if (expandAll != null) return;
    setAiReasonExpanded(!aiReasonExpanded);
  };

  return (
    <div
      className={`p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] transition-all duration-300 animate-fade-up ${hasUrl ? 'card-accent' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Score ring */}
        <div className="score-ring">
          <svg viewBox="0 0 36 36">
            <circle className="track" cx="18" cy="18" r="14" />
            <circle className="fill" cx="18" cy="18" r="14" stroke={scoreColor}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset} />
          </svg>
          <span className="text" style={{ color: scoreColor }}>{combinedScore}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row — title is the clickable link */}
          <div className="flex items-center gap-2 mb-1">
            {hasUrl ? (
              <a href={hotspot.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-zinc-200 hover:text-accent-glow transition-colors line-clamp-1 flex items-center gap-1"
                title={hotspot.title}>
                {hotspot.title}
                <span className="external-link-icon">↗</span>
              </a>
            ) : (
              <h3 className="text-sm font-medium text-zinc-300 line-clamp-1">
                {hotspot.title}
              </h3>
            )}
            {!hotspot.notified && (
              <span className="relative flex shrink-0">
                <span className="pulse-dot" style={{ background: '#F472B6' }} />
              </span>
            )}
          </div>

          {/* AI Summary — truncated with hover tooltip */}
          {aiSummary && (
            <p className="text-xs text-zinc-400 line-clamp-1 mb-1"
              title={summaryTruncated ? aiSummary : undefined}>
              <span className="text-zinc-600">AI摘要：</span>{displaySummary}
            </p>
          )}

          {/* Compact badge row: dot + scores + keyword + source + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block w-2 h-2 rounded-full ${scoreDot} shrink-0`}
              title={`${combinedScore >= 80 ? '高价值' : combinedScore >= 60 ? '中价值' : '低价值'} (${combinedScore})`} />
            <span className="text-[10px] text-zinc-500 font-mono"
              title={`相关性: ${relevanceScore} | 重要性: ${importance} | 时效: ${freshness}`}>
              R:{relevanceScore} I:{importance} F:{freshness}
            </span>
            <span className="keyword-tag">{hotspot.keyword}</span>
            {hotspot.source_name && <span className="text-[10px] text-zinc-600">{hotspot.source_name}</span>}
            {!hasUrl && <span className="text-[10px] text-zinc-700 italic">无链接</span>}
            <span className="text-[10px] text-zinc-600 ml-auto">{timeAgo}</span>
          </div>

          {/* Author + Engagement + PubDate */}
          {(author || hasEngagement || pubDate) && (
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              {author && (
                <span className="text-[10px] text-zinc-500 font-mono">👤 {author}</span>
              )}
              {hasEngagement && <EngagementBadges engagement={engagement} source={hotspot.source} />}
              {pubDate && (
                <span className="text-[10px] text-zinc-600 font-mono ml-auto"
                  title={`发布于 ${formatPubDate(pubDate)}`}>
                  📅 {formatPubDate(pubDate)}
                </span>
              )}
            </div>
          )}

          {/* Original snippet preview — collapsible */}
          {hasOriginalSnippet && (
            <div className="mt-2 pt-2 border-t border-white/[0.03]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-500/70">📄 原文预览</span>
                <button
                  onClick={() => setOriginalExpanded(!originalExpanded)}
                  className="text-[10px] text-zinc-500 hover:text-amber-400 transition-colors"
                >
                  {originalExpanded ? '收起 ▲' : '展开 ▾'}
                </button>
              </div>
              {originalExpanded && (
                <div className="original-snippet-content">
                  {originalSnippet}
                </div>
              )}
            </div>
          )}

          {/* AI Reason — collapsible */}
          {aiReason && (
            <div className="mt-2 pt-2 border-t border-white/[0.03]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-600">💡 AI分析</span>
                <button
                  onClick={toggleAiReason}
                  className="text-[10px] text-zinc-500 hover:text-accent-primary transition-colors"
                >
                  {reasonExpanded ? '收起 ▲' : '展开 ▾'}
                </button>
              </div>
              {reasonExpanded && (
                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                  {aiReason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Detect if an original snippet is just engagement stats (not actual readable content).
 * Stats-only snippets come from: HN, B站, GitHub, 掘金, Reddit, 微博热搜, 知乎.
 */
function isMeaningfulSnippet(text) {
  if (!text || text.length < 10) return false;
  // Check if the text is dominated by stat patterns
  const statPatterns = [
    /^\d+播放\s*\|\s*\d+弹幕/,           // B站
    /^\d+\s*热度/,                        // 微博热搜
    /^👍\s*\d+/, /^⬆\s*\d+/,            // 掘金/Reddit
    /^\d+\s*points/, /^\d+\s*得分/,       // HN/Reddit
    /^⭐\s*\d+/,                          // GitHub
    /^r\//,                               // Reddit subreddit only
  ];
  for (const p of statPatterns) {
    if (p.test(text)) return false;
  }
  // If text is very short and mostly numbers/symbols, consider it stats-only
  const alphaRatio = (text.match(/[\u4e00-\u9fa5a-zA-Z]/g) || []).length / text.length;
  if (text.length < 60 && alphaRatio < 0.3) return false;
  return true;
}

/** Render engagement badges based on source */
function EngagementBadges({ engagement, source }) {
  const badges = [];
  const s = source;

  if (s === 'hackernews') {
    if (engagement.points) badges.push({ icon: '👍', label: formatNum(engagement.points) });
    if (engagement.num_comments) badges.push({ icon: '💬', label: formatNum(engagement.num_comments) });
  } else if (s === 'bilibili') {
    if (engagement.play) badges.push({ icon: '▶️', label: formatNum(engagement.play) });
    if (engagement.danmaku) badges.push({ icon: '💬', label: formatNum(engagement.danmaku) });
  } else if (s === 'weibo_hot') {
    if (engagement.hotness) badges.push({ icon: '🔥', label: formatNum(engagement.hotness) });
  } else if (s === 'github') {
    if (engagement.followers) badges.push({ icon: '👥', label: formatNum(engagement.followers) });
    if (engagement.public_repos) badges.push({ icon: '📦', label: formatNum(engagement.public_repos) });
    if (engagement.stars) badges.push({ icon: '⭐', label: formatNum(engagement.stars) });
    if (engagement.forks) badges.push({ icon: '🍴', label: formatNum(engagement.forks) });
    if (engagement.language) badges.push({ icon: '🔤', label: engagement.language });
  } else if (s === 'juejin') {
    if (engagement.digg_count) badges.push({ icon: '👍', label: formatNum(engagement.digg_count) });
    if (engagement.comment_count) badges.push({ icon: '💬', label: formatNum(engagement.comment_count) });
    if (engagement.view_count) badges.push({ icon: '👀', label: formatNum(engagement.view_count) });
  } else if (s === 'zhihu') {
    if (engagement.votes) badges.push({ icon: '👍', label: formatNum(engagement.votes) });
  } else if (s === 'reddit') {
    if (engagement.score) badges.push({ icon: '⬆', label: formatNum(engagement.score) });
    if (engagement.num_comments) badges.push({ icon: '💬', label: formatNum(engagement.num_comments) });
    if (engagement.subreddit) badges.push({ icon: 'r/', label: engagement.subreddit });
  }

  if (!badges.length) return null;

  return (
    <>
      {badges.map((b, i) => (
        <span key={i} className="text-[10px] text-zinc-500 font-mono">
          {b.icon} {b.label}
        </span>
      ))}
    </>
  );
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function formatPubDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚发布';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return dateStr.slice(0, 10); }
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T') + 'Z');
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}
