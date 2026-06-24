import dbModule from '../db.js';
const { getDb } = dbModule;

export default function keywordRoutes(app) {
  // Get all keywords
  app.get('/api/keywords', (_req, res) => {
    const db = getDb();
    const keywords = db.prepare(`
      SELECT k.*, 
        (SELECT COUNT(*) FROM hotspots h WHERE h.keyword_id = k.id) as hotspot_count,
        (SELECT MAX(h.detected_at) FROM hotspots h WHERE h.keyword_id = k.id) as last_detected
      FROM keywords k 
      ORDER BY k.created_at DESC
    `).all();
    res.json(keywords);
  });

  // Add a keyword
  app.post('/api/keywords', (req, res) => {
    const { keyword, scope } = req.body;
    if (!keyword?.trim()) {
      return res.status(400).json({ error: '关键词不能为空' });
    }

    const db = getDb();
    // Check duplicate
    const existing = db.prepare('SELECT id FROM keywords WHERE keyword = ?').get(keyword.trim());
    if (existing) {
      return res.status(409).json({ error: '关键词已存在' });
    }

    const stmt = db.prepare('INSERT INTO keywords (keyword, scope) VALUES (?, ?)');
    const info = stmt.run(keyword.trim(), scope?.trim() || '');
    const newKeyword = db.prepare('SELECT * FROM keywords WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newKeyword);
  });

  // Update keyword (status, keyword, scope)
  app.patch('/api/keywords/:id', (req, res) => {
    const { status, keyword, scope } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM keywords WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '关键词不存在' });

    if (status) {
      db.prepare('UPDATE keywords SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    }
    if (keyword !== undefined && scope !== undefined) {
      db.prepare('UPDATE keywords SET keyword = ?, scope = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyword.trim(), scope?.trim() || '', req.params.id);
    }
    res.json({ success: true });
  });

  // Delete keyword
  app.delete('/api/keywords/:id', (req, res) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM keywords WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: '关键词不存在' });
    }
    res.json({ success: true });
  });

  // Trigger manual scan for a keyword
  app.post('/api/keywords/:id/scan', async (req, res) => {
    const db = getDb();
    const kw = db.prepare('SELECT * FROM keywords WHERE id = ?').get(req.params.id);
    if (!kw) return res.status(404).json({ error: '关键词不存在' });

    res.json({ message: `开始扫描 "${kw.keyword}"，请等待结果...` });

    // Run async - don't block response
    const { monitorKeyword } = await import('../monitor.js');
    try {
      const results = await monitorKeyword(kw, db);
      console.log(`[Manual Scan] "${kw.keyword}": ${results.length} new hotspots`);
    } catch (error) {
      console.error(`[Manual Scan] Error:`, error.message);
    }
  });
}
