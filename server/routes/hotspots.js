import dbModule from '../db.js';
const { getDb } = dbModule;
import { generateBatchSummary } from '../ai.js';

export default function hotspotRoutes(app) {
  // Get hotspots with pagination and filters
  app.get('/api/hotspots', (req, res) => {
    const db = getDb();
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    if (status === 'notified') {
      whereClause = 'WHERE h.notified = 1';
    } else if (status === 'unread') {
      whereClause = 'WHERE h.notified = 0';
    }

    const hotspots = db.prepare(`
      SELECT h.*, k.keyword, k.scope,
        CAST((h.relevance_score + h.importance + COALESCE(h.freshness, 50)) / 3 AS INTEGER) as combined_score
      FROM hotspots h
      JOIN keywords k ON h.keyword_id = k.id
      ${whereClause}
      ORDER BY h.detected_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM hotspots h ${whereClause}
    `).get(...params);

    res.json({
      data: hotspots,
      total: total.count,
      page: Number(page),
      totalPages: Math.ceil(total.count / limit)
    });
  });

  // Get recent new hotspots (since last check)
  app.get('/api/hotspots/new', async (req, res) => {
    const db = getDb();
    const { since } = req.query;
    const sinceDate = since || new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const hotspots = db.prepare(`
      SELECT h.*, k.keyword, k.scope,
        CAST((h.relevance_score + h.importance + COALESCE(h.freshness, 50)) / 3 AS INTEGER) as combined_score
      FROM hotspots h
      JOIN keywords k ON h.keyword_id = k.id
      WHERE h.detected_at > ? AND h.notified = 0
      ORDER BY combined_score DESC, h.detected_at DESC
      LIMIT 30
    `).all(sinceDate);

    // Generate AI summary for new hotspots
    let aiSummary = null;
    if (hotspots.length > 0) {
      try {
        aiSummary = await generateBatchSummary(hotspots);
      } catch {
        aiSummary = `发现 ${hotspots.length} 条新热点`;
      }

      // Mark as notified
      const ids = hotspots.map(h => h.id);
      if (ids.length) {
        db.prepare(
          `UPDATE hotspots SET notified = 1 WHERE id IN (${ids.join(',')})`
        ).run();
      }
    }

    res.json({
      data: hotspots,
      count: hotspots.length,
      aiSummary
    });
  });

  // Get dashboard stats
  app.get('/api/stats', (_req, res) => {
    const db = getDb();

    const totalKeywords = db.prepare("SELECT COUNT(*) as count FROM keywords").get();
    const activeKeywords = db.prepare("SELECT COUNT(*) as count FROM keywords WHERE status = 'active'").get();
    const totalHotspots = db.prepare("SELECT COUNT(*) as count FROM hotspots").get();
    const recent24h = db.prepare(
      "SELECT COUNT(*) as count FROM hotspots WHERE detected_at > datetime('now', '-24 hours')"
    ).get();
    const verified = db.prepare(
      "SELECT COUNT(*) as count FROM hotspots WHERE ai_verified = 1"
    ).get();
    const lastScan = db.prepare(
      "SELECT created_at FROM monitor_logs WHERE type = 'cycle' ORDER BY created_at DESC LIMIT 1"
    ).get();

    res.json({
      totalKeywords: totalKeywords.count,
      activeKeywords: activeKeywords.count,
      totalHotspots: totalHotspots.count,
      recent24h: recent24h.count,
      verified: verified.count,
      lastScan: lastScan?.created_at || null
    });
  });

  // Trigger a full monitor scan for all active keywords
  app.post('/api/scan', async (_req, res) => {
    const db = getDb();
    res.json({ message: '全量扫描已触发，请等待结果...' });
    // Run async — don't block response
    try {
      const { runMonitorCycle } = await import('../monitor.js');
      const result = await runMonitorCycle(db);
      console.log(`[Manual Scan] Complete: ${result.newHotspots.length} new hotspots`);
    } catch (error) {
      console.error('[Manual Scan] Error:', error.message);
    }
  });

  // Debug: test individual search sources
  app.get('/api/debug/search', async (req, res) => {
    const { keyword = 'TDesign' } = req.query;
    const {
      searchBaidu, searchGitHub, searchJuejin, searchZhihu, searchReddit
    } = await import('../search/web-scraper.js');

    const results = {};
    try { results.baidu = await searchBaidu(keyword, 2); } catch (e) { results.baidu = { error: e.message }; }
    try { results.github = await searchGitHub(keyword, 2); } catch (e) { results.github = { error: e.message }; }
    try { results.juejin = await searchJuejin(keyword, 2); } catch (e) { results.juejin = { error: e.message }; }
    try { results.zhihu = await searchZhihu(keyword, 2); } catch (e) { results.zhihu = { error: e.message }; }
    try { results.reddit = await searchReddit(keyword, 2); } catch (e) { results.reddit = { error: e.message }; }

    res.json({ keyword, results });
  });

  // Get recent logs
  app.get('/api/logs', (req, res) => {
    const db = getDb();
    const logs = db.prepare(
      'SELECT * FROM monitor_logs ORDER BY created_at DESC LIMIT 20'
    ).all();
    res.json(logs);
  });
}
