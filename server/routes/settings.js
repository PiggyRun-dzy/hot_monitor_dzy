import dbModule from '../db.js';
const { getDb } = dbModule;
import { updateInterval } from '../scheduler.js';

export default function settingsRoutes(app) {
  // Get all settings
  app.get('/api/settings', (_req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  });

  // Update settings
  app.put('/api/settings', (req, res) => {
    const db = getDb();
    const updates = req.body;

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    );

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, String(value));
      }
    });
    transaction();

    // If scan interval changed, restart scheduler
    if (updates.scan_interval) {
      updateInterval(parseInt(updates.scan_interval));
    }

    res.json({ success: true });
  });

  // Test email configuration
  app.post('/api/settings/test-email', async (req, res) => {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, notify_email } = req.body;

    try {
      const { testEmailConfig } = await import('../notifier.js');
      await testEmailConfig(smtp_host, smtp_port, smtp_user, smtp_pass, notify_email);
      res.json({ success: true, message: '测试邮件发送成功' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
}
