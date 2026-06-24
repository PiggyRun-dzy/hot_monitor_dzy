import { searchAll } from './search/web-scraper.js';
import { verifyContent } from './ai.js';

/**
 * Monitor a single keyword: search → AI verify → store → return new hotspots.
 */
export async function monitorKeyword(keywordObj, db) {
  const { id, keyword, scope } = keywordObj;
  console.log(`[Monitor] Scanning: "${keyword}"`);

  // Step 1: Search across multiple engines
  const searchResults = await searchAll(keyword, 5);

  if (!searchResults.length) {
    console.log(`[Monitor] No results for "${keyword}"`);
    return [];
  }

  console.log(`[Monitor] Found ${searchResults.length} raw results for "${keyword}"`);

  // Step 2: AI verification
  const newHotspots = [];
  for (const result of searchResults) {
    const ai = await verifyContent(
      result.title,
      result.snippet,
      result.url,
      keyword,
      scope
    );

    // Only accept relevant, non-fake content with good score
    if (ai.isRelevant && !ai.isFake && ai.score >= 60) {
      // Check if URL already exists for this keyword
      const existing = db.prepare(
        'SELECT id FROM hotspots WHERE keyword_id = ? AND url = ?'
      ).get(id, result.url);

      if (!existing) {
        const stmt = db.prepare(`
          INSERT INTO hotspots (keyword_id, title, url, summary, source, source_name, ai_verified, relevance_score, is_fake)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0)
        `);
        const info = stmt.run(id, result.title, result.url, ai.summary, result.source, result.source_name, ai.score);
        newHotspots.push({
          id: info.lastInsertRowid,
          keyword_id: id,
          keyword,
          title: result.title,
          url: result.url,
          summary: ai.summary,
          source: result.source,
          source_name: result.source_name,
          score: ai.score
        });
      }
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
