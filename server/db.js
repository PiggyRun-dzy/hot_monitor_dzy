import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'hot-monitor.db');

let dbWrapper = null;
let rawDb = null;

/**
 * Initialize the database. Must be called once at startup before getDb().
 */
export async function initDb() {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    rawDb = new SQL.Database(buffer);
  } else {
    rawDb = new SQL.Database();
  }

  dbWrapper = wrapDb(rawDb);
  dbWrapper.exec('PRAGMA foreign_keys = ON');
  initTables();
  saveDb();
  return dbWrapper;
}

export function getDb() {
  if (!dbWrapper) throw new Error('Database not initialized. Call initDb() first.');
  return dbWrapper;
}

function saveDb() {
  if (rawDb) {
    const data = rawDb.export();
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(DB_PATH, Buffer.from(data));
  }
}

function initTables() {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      scope TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','paused')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  rawDb.run(`
    CREATE TABLE IF NOT EXISTS hotspots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT,
      summary TEXT,
      source TEXT DEFAULT 'web',
      source_name TEXT DEFAULT '',
      ai_verified INTEGER DEFAULT 0,
      relevance_score INTEGER DEFAULT 0,
      importance INTEGER DEFAULT 0,
      is_fake INTEGER DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notified INTEGER DEFAULT 0
    )
  `);

  // Migration: add importance column if upgrading from older schema
  migrateAddColumn(rawDb, 'hotspots', 'importance', 'INTEGER DEFAULT 0');
  // Migration: add freshness column
  migrateAddColumn(rawDb, 'hotspots', 'freshness', 'INTEGER DEFAULT 0');

  rawDb.run(`
    CREATE TABLE IF NOT EXISTS monitor_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT DEFAULT 'info',
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  rawDb.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  rawDb.run('CREATE INDEX IF NOT EXISTS idx_hotspots_keyword ON hotspots(keyword_id)');
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_hotspots_detected ON hotspots(detected_at)');
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_keywords_status ON keywords(status)');

  // Initialize default settings
  initDefaultSettings(rawDb);

  saveDb();
}

/**
 * Safely add a column if it doesn't exist (sql.js compatible migration).
 */
function migrateAddColumn(rawDb, table, column, type) {
  try {
    // Try to read from the column; if it fails, column doesn't exist
    rawDb.run(`SELECT ${column} FROM ${table} LIMIT 1`);
  } catch {
    // Column doesn't exist — add it
    rawDb.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`[DB] Migration: added ${column} to ${table}`);
  }
}

/**
 * Insert default settings if not present.
 */
function initDefaultSettings(rawDb) {
  const defaults = {
    'scan_interval': '30',
    'min_score_engine': '70',
    'min_score_community': '55',
    'max_age_days': '7'
  };
  for (const [key, value] of Object.entries(defaults)) {
    try {
      const stmt = rawDb.prepare('SELECT value FROM settings WHERE key = ?');
      stmt.bind([key]);
      if (!stmt.step()) {
        const insertStmt = rawDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        insertStmt.bind([key, value]);
        insertStmt.step();
        insertStmt.free();
        console.log(`[DB] Default setting: ${key} = ${value}`);
      }
      stmt.free();
    } catch (e) {
      console.error(`[DB] Error setting default ${key}:`, e.message);
    }
  }
}

/**
 * Wrap the raw sql.js database with a better-sqlite3-like API.
 * All query methods are synchronous after initDb() completes.
 */
function wrapDb(db) {
  return {
    raw: db,

    prepare(sql) {
      return {
        run(...params) {
          try {
            const stmt = db.prepare(sql);
            if (params.length) stmt.bind(params);
            stmt.step();
            // Get last insert rowid BEFORE freeing statement
            let lastId = 0;
            let mod = 0;
            if (/^\s*INSERT/i.test(sql)) {
              const r = db.exec('SELECT last_insert_rowid() as id');
              if (r.length && r[0].values && r[0].values.length) {
                lastId = r[0].values[0][0];
              }
              mod = 1;
            } else {
              mod = db.getRowsModified();
            }
            stmt.free();
            saveDb();
            return { changes: mod || 1, lastInsertRowid: lastId };
          } catch (e) {
            console.error('SQL error:', sql, params, e.message);
            throw e;
          }
        },
        get(...params) {
          try {
            const stmt = db.prepare(sql);
            if (params.length) stmt.bind(params);
            let row = null;
            if (stmt.step()) {
              row = stmt.getAsObject();
            }
            stmt.free();
            return row;
          } catch (e) {
            console.error('SQL error:', sql, params, e.message);
            throw e;
          }
        },
        all(...params) {
          try {
            const results = [];
            const stmt = db.prepare(sql);
            if (params.length) stmt.bind(params);
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
          } catch (e) {
            console.error('SQL error:', sql, params, e.message);
            throw e;
          }
        }
      };
    },

    exec(sql) {
      db.run(sql);
      saveDb();
    },

    transaction(fn) {
      db.run('BEGIN');
      try {
        fn();
        db.run('COMMIT');
        saveDb();
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },

    close() {
      saveDb();
      db.close();
    }
  };
}

export default { initDb, getDb };
