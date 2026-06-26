import { searchAll } from './search/web-scraper.js';
import { verifyContent, expandQuery } from './ai.js';

// ==================== Engagement thresholds ====================
const ENGAGEMENT_RULES = [
  {
    sources: ['hackernews'],
    name: 'HackerNews',
    check: (r) => (r.points || 0) >= 10 && (r.num_comments || 0) >= 5,
    label: '赞≥10 & 评论≥5'
  },
  {
    sources: ['bilibili'],
    name: 'B站',
    check: (r) => (r.play || 0) >= 500,
    label: '播放≥500'
  },
  {
    sources: ['weibo_hot'],
    name: '微博热搜',
    check: (r) => (r.hotness || 0) >= 100000,
    label: '热度≥10万'
  },
  {
    sources: ['github'],
    name: 'GitHub',
    // Accounts: followers >= 5. Repos: stars >= 10. Either qualifies.
    check: (r) => r.isAccount ? (r.followers || 0) >= 5 : (r.stars || 0) >= 10,
    label: 'Stars≥10 或 Followers≥5'
  },
  {
    sources: ['juejin'],
    name: '掘金',
    check: (r) => (r.digg_count || 0) >= 5,
    label: '点赞≥5'
  },
  {
    sources: ['reddit'],
    name: 'Reddit',
    check: (r) => (r.score || 0) >= 10 && (r.num_comments || 0) >= 3,
    label: '得分≥10 & 评论≥3'
  }
];

// Search engines: no engagement data, rely purely on AI
const ENGINE_SOURCES = new Set(['bing', 'google', 'ddg', 'sogou', 'weibo', 'baidu', 'zhihu']);
const COMMUNITY_SOURCES = new Set(['hackernews', 'bilibili', 'weibo_hot', 'github', 'juejin', 'reddit']);

// Tracking params to strip from URLs before dedup
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'from', 'spm', 'scm',
  'tracking', 'track', 'session_id', 'vd_source',
  '_ga', '_gl', 'mc_cid', 'mc_eid', 'pk_campaign', 'pk_kwd',
  'igshid', 'wd', 'eqid', 'rsv_spt', 'rsv_iqid'
]);

/**
 * Normalize URL for dedup comparison: strip tracking params, decode redirects,
 * lowercase scheme+host, remove trailing slash, remove www.
 */
function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim().toLowerCase();

  // Try to extract real URL from known search-engine redirect wrappers
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
    // Google redirect: /url?q=REAL_URL
    if (parsed.hostname.includes('google') && parsed.searchParams.has('q')) {
      const q = parsed.searchParams.get('q');
      if (q && q.startsWith('http')) {
        url = q.toLowerCase();
      }
    }
    // Baidu link redirect
    if (parsed.hostname.includes('baidu.com') && parsed.searchParams.has('url')) {
      const real = parsed.searchParams.get('url');
      if (real && real.startsWith('http')) {
        url = real.toLowerCase();
      }
    }
    // Sogou link redirect
    if (parsed.hostname.includes('sogou.com') && parsed.searchParams.has('url')) {
      const real = parsed.searchParams.get('url');
      if (real && real.startsWith('http')) {
        try { url = decodeURIComponent(real).toLowerCase(); } catch { url = real.toLowerCase(); }
      }
    }
  } catch { /* invalid URL, use raw */ }

  // Normalize: strip tracking params + trailing slash + www
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    // Remove trailing slash from path (unless path is just "/")
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    // Remove www. prefix
    if (u.hostname.startsWith('www.')) {
      u.hostname = u.hostname.slice(4);
    }
    // Remove fragment
    u.hash = '';
    // Sort query params for consistent ordering
    u.searchParams.sort();
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Normalize title for fuzzy dedup: lowercase, remove punctuation noise, truncate.
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[\s\-_|·•,，。！？、；：""''（）()【】\[\]《》<>「」『』～~]+/g, ' ')  // collapse separators
    .replace(/[^\w\u4e00-\u9fff\s]/g, '')  // remove special chars, keep CJK+alphanum+space
    .replace(/\s+/g, ' ')                   // collapse multiple spaces
    .trim()
    .slice(0, 80);                          // first 80 chars for comparison
}

/**
 * Build engagement JSON from search result based on source type.
 */
function buildEngagement(result) {
  const e = {};
  const s = result.source;
  if (s === 'hackernews') {
    if (result.points) e.points = result.points;
    if (result.num_comments) e.num_comments = result.num_comments;
  } else if (s === 'bilibili') {
    if (result.play) e.play = result.play;
    if (result.danmaku) e.danmaku = result.danmaku;
  } else if (s === 'weibo_hot') {
    if (result.hotness) e.hotness = result.hotness;
  } else if (s === 'github') {
    if (result.isAccount) {
      if (result.followers) e.followers = result.followers;
      if (result.public_repos) e.public_repos = result.public_repos;
    } else {
      if (result.stars) e.stars = result.stars;
      if (result.forks) e.forks = result.forks;
    }
    if (result.language) e.language = result.language;
    if (result.owner) e.owner = result.owner;
  } else if (s === 'juejin') {
    if (result.digg_count) e.digg_count = result.digg_count;
    if (result.comment_count) e.comment_count = result.comment_count;
    if (result.view_count) e.view_count = result.view_count;
  } else if (s === 'zhihu') {
    if (result.votes) e.votes = result.votes;
  } else if (s === 'reddit') {
    if (result.score) e.score = result.score;
    if (result.num_comments) e.num_comments = result.num_comments;
    if (result.subreddit) e.subreddit = result.subreddit;
  }
  return e;
}

/**
 * Get source category for threshold selection.
 */
function getSourceCategory(source) {
  if (COMMUNITY_SOURCES.has(source)) return 'community';
  return 'engine'; // Default to engine for unknown sources
}

/**
 * Apply engagement pre-filter: reject results that don't meet minimum thresholds.
 * Returns { passed, rejected } arrays.
 */
function filterByEngagement(results) {
  const passed = [];
  const rejected = [];

  for (const r of results) {
    const rule = ENGAGEMENT_RULES.find(rule => rule.sources.includes(r.source));
    if (!rule) {
      // No engagement rule for this source (e.g., search engines) — pass through
      passed.push(r);
      continue;
    }
    if (rule.check(r)) {
      passed.push(r);
    } else {
      console.log(`  [Filter] ${rule.name} rejected (${rule.label}): "${r.title?.slice(0, 40)}"`);
      rejected.push(r);
    }
  }

  return { passed, rejected };
}

/**
 * Monitor a single keyword: search → freshness filter → engagement filter → AI verify → combined score → store.
 */
export async function monitorKeyword(keywordObj, db) {
  const { id, keyword, scope } = keywordObj;
  console.log(`[Monitor] Scanning: "${keyword}"`);

  // Load thresholds from settings
  const minScoreEngine = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'min_score_engine'").get()?.value
  ) || 70;
  const minScoreCommunity = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'min_score_community'").get()?.value
  ) || 55;
  const maxAgeDays = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'max_age_days'").get()?.value
  ) || 7;

  // Step 0: Query expansion — generate related search queries for better coverage
  const expandedQueries = await expandQuery(keyword, scope);
  console.log(`[Monitor] Expanded "${keyword}" → ${expandedQueries.length} queries: [${expandedQueries.join(', ')}]`);

  // Step 1: Search across all expanded queries with round-robin
  const perQueryResults = Math.max(3, Math.floor(8 / expandedQueries.length));
  const allRawResults = [];
  const seenUrls = new Set();
  const seenTitles = new Set();

  for (const q of expandedQueries) {
    try {
      const results = await searchAll(q, perQueryResults);
      for (const r of results) {
        const normUrl = normalizeUrl(r.url);
        const normTitle = normalizeTitle(r.title);
        // L1: dedup by normalized URL (handles different search engine redirects)
        if (normUrl && seenUrls.has(normUrl)) continue;
        // L1: dedup by normalized title (handles same article with different URLs)
        if (normTitle && seenTitles.has(normTitle)) {
          console.log(`  [Dedup] Title match: "${r.title?.slice(0, 40)}" (same as earlier result, different URL)`);
          continue;
        }
        if (normUrl) seenUrls.add(normUrl);
        if (normTitle) seenTitles.add(normTitle);
        allRawResults.push(r);
      }
    } catch (error) {
      console.error(`[Monitor] Search error for expanded query "${q}":`, error.message);
    }
  }

  if (!allRawResults.length) {
    console.log(`[Monitor] No results for "${keyword}"`);
    return [];
  }

  console.log(`[Monitor] Found ${allRawResults.length} raw results for "${keyword}" (from ${expandedQueries.length} queries)`);

  // Step 2: Freshness pre-filter — drop results older than max_age_days
  const now = Date.now();
  const ageFiltered = [];
  for (const r of allRawResults) {
    if (r.pub_date) {
      const pubTime = new Date(r.pub_date).getTime();
      const ageDays = (now - pubTime) / (86400 * 1000);
      if (ageDays > maxAgeDays) {
        console.log(`  [AgeFilter] ${r.source_name}: ${Math.round(ageDays)}d old → dropped: "${r.title?.slice(0, 40)}"`);
        continue;
      }
    }
    ageFiltered.push(r);
  }
  if (ageFiltered.length < allRawResults.length) {
    console.log(`[Monitor] Age filter: ${allRawResults.length - ageFiltered.length} stale results dropped, ${ageFiltered.length} remain`);
  }
  if (!ageFiltered.length) {
    console.log(`[Monitor] All results too old for "${keyword}"`);
    return [];
  }

  // Step 3: Engagement pre-filter
  const { passed, rejected } = filterByEngagement(ageFiltered);
  if (rejected.length) {
    console.log(`[Monitor] Engagement filter: ${rejected.length} rejected, ${passed.length} passed`);
  }

  if (!passed.length) {
    console.log(`[Monitor] All results filtered out by engagement thresholds for "${keyword}"`);
    return [];
  }

  // Step 4: AI verification (strict mode — failures skip the result)
  const newHotspots = [];
  // In-cycle dedup sets (URL + title, already deduped in Step 1, but double-check here)
  const cycleSeenUrls = new Set();
  const cycleSeenTitles = new Set();
  for (const result of passed) {
    try {
      const ai = await verifyContent(
        result.title,
        result.snippet,
        result.url,
        keyword,
        scope
      );

      // L2: DB dedup — check by normalized URL AND normalized title for this keyword
      const normUrl = normalizeUrl(result.url);
      const normTitle = normalizeTitle(result.title);
      const existingRows = db.prepare(
        'SELECT id, url, title FROM hotspots WHERE keyword_id = ?'
      ).all(id);

      let isDuplicate = false;
      for (const row of existingRows) {
        if (normUrl && normalizeUrl(row.url) === normUrl) {
          console.log(`  [Dedup] DB URL match: "${result.title?.slice(0, 40)}"`);
          isDuplicate = true;
          break;
        }
        if (normTitle && normalizeTitle(row.title) === normTitle) {
          console.log(`  [Dedup] DB title match: "${result.title?.slice(0, 40)}"`);
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) continue;

      // Calculate 3-dimension combined score
      const combinedScore = Math.round((ai.score + ai.importance + ai.freshness) / 3);
      const sourceCategory = getSourceCategory(result.source);
      const minScore = sourceCategory === 'community' ? minScoreCommunity : minScoreEngine;

      // Hard reject: low relevance — irrelevant/spam/commercial content, discard regardless of I/F
      if (ai.score < 40) {
        console.log(`  [AI Skip] relevance=${ai.score} < 40 (irrelevant/spam/commercial type=${ai.contentType || 'unknown'}): "${result.title?.slice(0, 40)}"`);
        continue;
      }

      // Hard reject: stale content
      if (ai.freshness < 40) {
        console.log(`  [AI Skip] freshness=${ai.freshness} < 40 (stale): "${result.title?.slice(0, 40)}"`);
        continue;
      }

      // Only accept relevant, non-fake content with good combined score
      if (!ai.isRelevant || ai.isFake || combinedScore < minScore) {
        console.log(`  [AI Skip] R=${ai.score} I=${ai.importance} F=${ai.freshness} combined=${combinedScore} threshold=${minScore} type=${ai.contentType || '?'} src=${result.source}: "${result.title?.slice(0, 40)}"`);
        continue;
      }

      // L3: In-cycle dedup final check (prevents same content from different sources)
      if (normUrl && cycleSeenUrls.has(normUrl)) {
        console.log(`  [Dedup] Cycle URL already seen: "${result.title?.slice(0, 40)}"`);
        continue;
      }
      if (normTitle && cycleSeenTitles.has(normTitle)) {
        console.log(`  [Dedup] Cycle title already seen: "${result.title?.slice(0, 40)}"`);
        continue;
      }
      if (normUrl) cycleSeenUrls.add(normUrl);
      if (normTitle) cycleSeenTitles.add(normTitle);

      const engagement = buildEngagement(result);
      const stmt = db.prepare(`
        INSERT INTO hotspots (keyword_id, title, url, summary, source, source_name, ai_verified, relevance_score, importance, freshness, is_fake, pub_date, original_snippet, author, engagement, ai_reason)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, ?)
      `);
      // Store contentType in ai_reason for traceability: "type:article | reason text"
      const aiReasonWithType = ai.contentType
        ? `[${ai.contentType}] ${ai.reason || ''}`.trim()
        : (ai.reason || '');
      const info = stmt.run(
        id, result.title, result.url, ai.summary, result.source, result.source_name,
        ai.score, ai.importance, ai.freshness,
        result.pub_date || '', result.snippet || '', result.author || '',
        JSON.stringify(engagement), aiReasonWithType
      );
      newHotspots.push({
        id: info.lastInsertRowid,
        keyword_id: id,
        keyword,
        title: result.title,
        url: result.url,
        summary: ai.summary,
        source: result.source,
        source_name: result.source_name,
        score: ai.score,
        importance: ai.importance,
        freshness: ai.freshness,
        pub_date: result.pub_date || '',
        original_snippet: result.snippet || '',
        author: result.author || '',
        engagement,
        ai_reason: ai.reason || ''
      });
      console.log(`  [AI Pass] R=${ai.score} I=${ai.importance} F=${ai.freshness} combined=${combinedScore} type=${ai.contentType || '?'} src=${result.source}: "${result.title?.slice(0, 40)}"`);
    } catch (error) {
      // Strict mode: AI failure → skip this result entirely
      console.log(`  [AI Fail] "${result.title?.slice(0, 40)}" — ${error.message} → skipped`);
      continue;
    }
  }

  console.log(`[Monitor] "${keyword}": ${newHotspots.length} new verified hotspots`);
  return newHotspots;
}

/**
 * Run full monitoring cycle for all active keywords.
 */
export async function runMonitorCycle(db) {
  const keywords = db.prepare(
    "SELECT * FROM keywords WHERE status = 'active'"
  ).all();

  if (!keywords.length) {
    console.log('[Monitor] No active keywords to monitor.');
    return { newHotspots: [] };
  }

  console.log(`[Monitor] Starting cycle for ${keywords.length} keywords...`);

  // Process keywords sequentially to respect rate limits
  const allNewHotspots = [];
  for (const kw of keywords) {
    try {
      const newItems = await monitorKeyword(kw, db);
      allNewHotspots.push(...newItems);
    } catch (error) {
      console.error(`[Monitor] Error monitoring "${kw.keyword}":`, error.message);
    }
  }

  // Log cycle
  db.prepare(
    "INSERT INTO monitor_logs (type, message) VALUES (?, ?)"
  ).run('cycle', `扫描完成: ${keywords.length} 个关键词, 发现 ${allNewHotspots.length} 条新热点`);

  return { newHotspots: allNewHotspots };
}

export default { monitorKeyword, runMonitorCycle };
