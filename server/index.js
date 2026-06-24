import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { startScheduler } from './scheduler.js';
import keywordRoutes from './routes/keywords.js';
import hotspotRoutes from './routes/hotspots.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes (registered before DB init, but routes call getDb() lazily)
keywordRoutes(app);
hotspotRoutes(app);
settingsRoutes(app);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

// Initialize database then start server
async function startup() {
  await initDb();
  console.log('[DB] SQLite initialized (sql.js)');

  app.listen(PORT, () => {
    console.log(`[Server] Hot Monitor running at http://localhost:${PORT}`);
    console.log(`[Server] API available at http://localhost:${PORT}/api`);

    // Start monitoring scheduler
    startScheduler();
  });
}

startup().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

export default app;
