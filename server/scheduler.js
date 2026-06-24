import cron from 'node-cron';
import { runMonitorCycle } from './monitor.js';
import dbModule from './db.js';
const { getDb } = dbModule;

let cronJob = null;

export function startScheduler() {
  const db = getDb();

  // Load interval from settings or default to 30 minutes
  const intervalSetting = db.prepare(
    "SELECT value FROM settings WHERE key = 'scan_interval'"
  ).get();
  const intervalMinutes = parseInt(intervalSetting?.value) || 30;

  // Convert minutes to cron expression: every N minutes
  const cronExpr = `*/${intervalMinutes} * * * *`;

  console.log(`[Scheduler] Starting with interval: ${intervalMinutes} minutes (${cronExpr})`);

  // Schedule the monitoring cycle
  cronJob = cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Triggered at ${new Date().toISOString()}`);
    try {
      await runMonitorCycle(db);
    } catch (error) {
      console.error('[Scheduler] Cycle error:', error.message);
    }
  });

  // Run first cycle after 10 seconds for immediate feedback
  setTimeout(async () => {
    console.log('[Scheduler] Running initial scan...');
    try {
      await runMonitorCycle(db);
    } catch (error) {
      console.error('[Scheduler] Initial scan error:', error.message);
    }
  }, 10000);

  return cronJob;
}

export function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    console.log('[Scheduler] Stopped');
  }
}

export function updateInterval(minutes) {
  stopScheduler();
  startScheduler();
}

export default { startScheduler, stopScheduler, updateInterval };
