import { searchAll } from './search/web-scraper.js';
import { verifyContent } from './ai.js';

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

  // Step 1: Search across multiple engines
  const searchResults = await searchAll(keyword, 8);

  if (!searchResults.length) {
    console.log(`[Monitor] No results for "${keyword}"`);
    return [];
  }

  console.log(`[Monitor] Found ${searchResults.length} raw results for "${keyword}"`);

  // Step 2: Freshness pre-filter — drop results older than max_age_days
  const now = Date.now();
  const ageFiltered = [];
  for (const r of searchResults) {
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
  if (ageFiltered.length < searchResults.length) {
    console.log(`[Monitor] Age filter: ${searchResults.length - ageFiltered.length} stale results dropped, ${ageFiltered.length} remain`);
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

  // Step 3: AI verification (strict mode — failures skip the result)
  const newHotspots = [];
  for (const result of passed) {
    try {
      const ai = await verifyContent(
        result.title,
        result.snippet,
        result.url,
        keyword,
        scope
      );

      // Check if URL already exists for this keyword
      const existing = db.prepare(
        'SELECT id FROM hotspots WHERE keyword_id = ? AND url = ?'
      ).get(id, result.url);

      if (existing) continue;

      // Calculate 3-dimension combined score
      const combinedScore = Math.round((ai.score + ai.importance + ai.freshness) / 3);
      const sourceCategory = getSourceCategory(result.source);
      const minScore = sourceCategory === 'community' ? minScoreCommunity : minScoreEngine;

      // Hard reject: stale content
      if (ai.freshness < 40) {
        console.log(`  [AI Skip] freshness=${ai.freshness} < 40 (stale): "${result.title?.slice(0, 40)}"`);
        continue;
      }

      // Only accept relevant, non-fake content with good combined score
      if (!ai.isRelevant || ai.isFake || combinedScore < minScore) {
        console.log(`  [AI Skip] score=${ai.score} imp=${ai.importance} fresh=${ai.freshness} combined=${combinedScore} threshold=${minScore} src=${result.source}: "${result.title?.slice(0, 40)}"`);
        continue;
      }

      const stmt = db.prepare(`
        INSERT INTO hotspots (keyword_id, title, url, summary, source, source_name, ai_verified, relevance_score, importance, freshness, is_fake)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)
      `);
      const info = stmt.run(id, result.title, result.url, ai.summary, result.source, result.source_name, ai.score, ai.importance, ai.freshness);
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
        freshness: ai.freshness
      });
      console.log(`  [AI Pass] score=${ai.score} imp=${ai.importance} fresh=${ai.freshness} combined=${combinedScore} src=${result.source}: "${result.title?.slice(0, 40)}"`);
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
