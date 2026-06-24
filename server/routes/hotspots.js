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
      SELECT h.*, k.keyword, k.scope
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
      SELECT h.*, k.keyword, k.scope
      FROM hotspots h
      JOIN keywords k ON h.keyword_id = k.id
      WHERE h.detected_at > ? AND h.notified = 0
      ORDER BY h.relevance_score DESC, h.detected_at DESC
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

  // Get recent logs
  app.get('/api/logs', (req, res) => {
    const db = getDb();
    const logs = db.prepare(
      'SELECT * FROM monitor_logs ORDER BY created_at DESC LIMIT 20'
    ).all();
    res.json(logs);
  });
}
