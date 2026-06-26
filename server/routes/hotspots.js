import dbModule from '../db.js';
const { getDb } = dbModule;
import { generateBatchSummary, evaluateAIPerformance } from '../ai.js';

// Source classification
const ENGINE_SOURCES = ['bing', 'google', 'ddg', 'sogou', 'baidu'];
const COMMUNITY_SOURCES = ['hackernews', 'bilibili', 'weibo', 'github', 'juejin', 'zhihu', 'reddit'];
const ALL_SOURCES = [...ENGINE_SOURCES, ...COMMUNITY_SOURCES];

export default function hotspotRoutes(app) {
  // Get hotspots with pagination, sorting, and filters
  app.get('/api/hotspots', (req, res) => {
    const db = getDb();
    const {
      page = 1, limit = 20,
      // Sort
      sort = 'detected_at', order = 'desc',
      // Filters
      status = 'all', source, source_type, keyword_id,
      time, score_min, score_max,
      r_min, r_max, i_min, i_max, f_min, f_max,
      ai_verified
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];
    const params = [];

    // Source filter: comma-separated source identifiers
    if (source) {
      const sources = source.split(',').map(s => s.trim()).filter(Boolean);
      if (sources.length > 0) {
        conditions.push(`h.source IN (${sources.map(() => '?').join(',')})`);
        params.push(...sources);
      }
    }

    // Source type filter: engine | community
    if (source_type === 'engine') {
      conditions.push(`h.source IN (${ENGINE_SOURCES.map(() => '?').join(',')})`);
      params.push(...ENGINE_SOURCES);
    } else if (source_type === 'community') {
      conditions.push(`h.source IN (${COMMUNITY_SOURCES.map(() => '?').join(',')})`);
      params.push(...COMMUNITY_SOURCES);
    }

    // Keyword filter: comma-separated keyword IDs
    if (keyword_id) {
      const ids = keyword_id.split(',').map(s => Number(s.trim())).filter(Boolean);
      if (ids.length > 0) {
        conditions.push(`h.keyword_id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    // Time range filter
    if (time === '1h') {
      conditions.push("h.detected_at > datetime('now', '-1 hours')");
    } else if (time === '24h') {
      conditions.push("h.detected_at > datetime('now', '-24 hours')");
    } else if (time === '7d') {
      conditions.push("h.detected_at > datetime('now', '-7 days')");
    } else if (time === '30d') {
      conditions.push("h.detected_at > datetime('now', '-30 days')");
    }

    // Combined score range
    const combinedExpr = "CAST((h.relevance_score + h.importance + COALESCE(h.freshness, 50)) / 3 AS INTEGER)";
    if (score_min !== undefined && score_min !== '') {
      conditions.push(`${combinedExpr} >= ?`);
      params.push(Number(score_min));
    }
    if (score_max !== undefined && score_max !== '') {
      conditions.push(`${combinedExpr} <= ?`);
      params.push(Number(score_max));
    }

    // R/I/F range filters
    if (r_min !== undefined && r_min !== '') { conditions.push('h.relevance_score >= ?'); params.push(Number(r_min)); }
    if (r_max !== undefined && r_max !== '') { conditions.push('h.relevance_score <= ?'); params.push(Number(r_max)); }
    if (i_min !== undefined && i_min !== '') { conditions.push('h.importance >= ?'); params.push(Number(i_min)); }
    if (i_max !== undefined && i_max !== '') { conditions.push('h.importance <= ?'); params.push(Number(i_max)); }
    if (f_min !== undefined && f_min !== '') { conditions.push('h.freshness >= ?'); params.push(Number(f_min)); }
    if (f_max !== undefined && f_max !== '') { conditions.push('h.freshness <= ?'); params.push(Number(f_max)); }

    // AI verified filter
    if (ai_verified === '1') {
      conditions.push('h.ai_verified = 1');
    } else if (ai_verified === '0') {
      conditions.push('h.ai_verified = 0');
    }

    // Notified filter (via status param - backward compatible)
    if (status === 'notified') {
      conditions.push('h.notified = 1');
    } else if (status === 'unread') {
      conditions.push('h.notified = 0');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Build ORDER BY (whitelist to prevent SQL injection)
    const allowedSorts = {
      combined_score: combinedExpr,
      detected_at: 'h.detected_at',
      relevance_score: 'h.relevance_score',
      importance: 'h.importance',
      freshness: 'h.freshness',
      source: 'h.source_name'
    };
    const sortField = allowedSorts[sort] || 'h.detected_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const hotspots = db.prepare(`
      SELECT h.*, k.keyword, k.scope,
        ${combinedExpr} as combined_score
      FROM hotspots h
      JOIN keywords k ON h.keyword_id = k.id
      ${whereClause}
      ORDER BY ${sortField} ${sortDir}, h.detected_at DESC
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

  // AI Self-Evaluation: trigger evaluation for historical hotspots
  app.post('/api/ai/evaluate', async (req, res) => {
    const db = getDb();
    const { sampleSize = 20, keywordId } = req.body || {};

    try {
      const report = await evaluateAIPerformance(db, {
        sampleSize: Math.min(Number(sampleSize), 50),
        keywordId: keywordId ? Number(keywordId) : null
      });

      // Save evaluation result to monitor_logs
      if (!report.error) {
        const summary = report.summary || {};
        const msg = `AI评估完成: 抽样${report.sampleSize}条, 一致${summary.consistent}条, 偏差${summary.discrepant}条, 准确率${summary.accuracyPercentage}%`;
        db.prepare("INSERT INTO monitor_logs (type, message) VALUES (?, ?)").run('ai_evaluate', msg);
      }

      res.json(report);
    } catch (error) {
      console.error('[AI Eval] API error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get latest AI evaluation report
  app.get('/api/ai/evaluate/latest', (req, res) => {
    const db = getDb();
    const log = db.prepare(
      "SELECT * FROM monitor_logs WHERE type = 'ai_evaluate' ORDER BY created_at DESC LIMIT 1"
    ).get();
    res.json(log || null);
  });
}
