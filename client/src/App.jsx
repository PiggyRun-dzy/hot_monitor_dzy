import { useState, useEffect, useCallback } from 'react';
import RadarScanner from './components/RadarScanner';
import StatsHUD from './components/StatsHUD';
import KeywordManager from './components/KeywordManager';
import HotspotFeed from './components/HotspotFeed';
import SettingsModal from './components/SettingsModal';
import AddKeywordModal from './components/AddKeywordModal';

export default function App() {
  const [keywords, setKeywords] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [stats, setStats] = useState({});
  const [newCount, setNewCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);

  const api = useCallback((path, options) =>
    fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
      .then(r => r.json()), []);

  // Load initial data
  useEffect(() => {
    loadAll();
    const poll = setInterval(loadAll, 15000); // Poll every 15s
    return () => clearInterval(poll);
  }, []);

  const loadAll = async () => {
    try {
      const [kws, hs, st, lg] = await Promise.all([
        api('/api/keywords'),
        api('/api/hotspots?limit=30'),
        api('/api/stats'),
        api('/api/logs')
      ]);
      setKeywords(kws || []);
      setHotspots(hs?.data || []);
      setStats(st || {});
      setLogs(lg || []);
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  const addKeyword = async (keyword, scope) => {
    const res = await api('/api/keywords', {
      method: 'POST',
      body: JSON.stringify({ keyword, scope })
    });
    if (res.error) {
      alert(res.error);
      return false;
    }
    await loadAll();
    return true;
  };

  const toggleKeyword = async (id, status) => {
    await api(`/api/keywords/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    loadAll();
  };

  const deleteKeyword = async (id) => {
    if (!confirm('确定删除这个监控关键词？')) return;
    await api(`/api/keywords/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const checkNew = async () => {
    setScanning(true);
    try {
      const res = await api('/api/hotspots/new');
      setNewCount(res.count || 0);
      if (res.aiSummary) {
        // Show summary briefly
      }
      loadAll();
    } catch (e) {
      console.error(e);
    }
    setScanning(false);
  };

  const scanKeyword = async (id) => {
    await api(`/api/keywords/${id}/scan`, { method: 'POST' });
    setTimeout(loadAll, 3000);
  };

  return (
    <div className="min-h-screen bg-cyber-dark scanner-bg">
      {/* Header */}
      <header className="border-b border-cyber-border bg-cyber-panel/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="status-led online" />
            <h1 className="text-xl font-bold text-cyber-cyan glitch-text tracking-wider">
              HOT MONITOR
            </h1>
            <span className="text-hud-dim text-xs font-mono hidden sm:inline">
              v1.0 · AI 热点雷达
            </span>
          </div>

          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <button
                onClick={checkNew}
                className="flex items-center gap-2 bg-cyber-pink/10 border border-cyber-pink/30 text-cyber-pink px-3 py-1.5 rounded text-sm hover:bg-cyber-pink/20 transition-colors"
              >
                <span className="notify-dot" />
                {newCount} 条新热点
              </button>
            )}
            <button
              onClick={checkNew}
              disabled={scanning}
              className="cyber-btn bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple px-4 py-1.5 rounded text-sm hover:bg-cyber-purple/30 disabled:opacity-50 transition-all"
            >
              {scanning ? '扫描中...' : '🔄 手动扫描'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="text-hud-dim hover:text-cyber-cyan transition-colors p-1"
              title="设置"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Radar + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RadarScanner stats={stats} keywords={keywords} />
          </div>
          <div className="lg:col-span-2">
            <StatsHUD stats={stats} logs={logs} />
          </div>
        </div>

        {/* Keywords + Hotspots */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <KeywordManager
              keywords={keywords}
              onAdd={() => setShowAddKeyword(true)}
              onToggle={toggleKeyword}
              onDelete={deleteKeyword}
              onScan={scanKeyword}
            />
          </div>
          <div className="lg:col-span-2">
            <HotspotFeed hotspots={hotspots} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddKeyword && (
        <AddKeywordModal
          onClose={() => setShowAddKeyword(false)}
          onAdd={addKeyword}
        />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
