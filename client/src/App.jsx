import { useState, useEffect, useCallback } from 'react';
import KeywordManager from './components/KeywordManager';
import HotspotFeed from './components/HotspotFeed';
import StatsBar from './components/StatsBar';
import AddKeywordModal from './components/AddKeywordModal';
import SettingsModal from './components/SettingsModal';
import SearchPanel from './components/SearchPanel';
import LampEffect from './components/ui/LampEffect';
import Spotlight from './components/ui/Spotlight';
import LogPopover from './components/LogPopover';

const TABS = [
  { key: 'feed',     label: '热点流', icon: '🔥' },
  { key: 'keywords', label: '监控词', icon: '🎯' },
  { key: 'search',   label: '搜索',   icon: '🔍' },
];

export default function App() {
  const [keywords, setKeywords] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState('feed');
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scanning, setScanning] = useState(false);

  const api = useCallback((path, opts) =>
    fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json()), []);

  const loadAll = useCallback(async () => {
    try {
      const [kws, hs, st] = await Promise.all([
        api('/api/keywords'), api('/api/hotspots?limit=50'), api('/api/stats')
      ]);
      setKeywords(kws || []); setHotspots(hs?.data || []); setStats(st || {});
    } catch { /* ignore */ }
  }, [api]);

  useEffect(() => { loadAll(); const t = setInterval(loadAll, 15000); return () => clearInterval(t); }, [loadAll]);

  const addKeyword = async (kw, scope) => {
    const r = await api('/api/keywords', { method: 'POST', body: JSON.stringify({ keyword: kw, scope }) });
    if (r.error) { alert(r.error); return false; }
    loadAll(); return true;
  };
  const toggleKw = (id, s) => api(`/api/keywords/${id}`, { method: 'PATCH', body: JSON.stringify({ status: s === 'active' ? 'paused' : 'active' }) }).then(loadAll);
  const delKw = async id => { if (confirm('删除？')) { await api(`/api/keywords/${id}`, { method: 'DELETE' }); loadAll(); } };
  const scanAll = async () => { setScanning(true); try { await api('/api/hotspots/new'); loadAll(); } catch { } setScanning(false); };
  const updateKw = (id, kw, scope) => api(`/api/keywords/${id}`, { method: 'PATCH', body: JSON.stringify({ keyword: kw, scope }) }).then(loadAll);

  const newCount = stats.recent24h || 0;

  return (
    <div className="min-h-screen bg-space-darkest text-zinc-200 relative">
      <div className="dot-bg" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial pointer-events-none z-0" />

      <Spotlight className="fixed inset-0 z-10" />
      <div className="relative z-20">
        {/* Header */}
        <header className="border-b border-white/[0.04] backdrop-blur-xl bg-space-dark/40 sticky top-0 z-40 relative">
          <LampEffect className="overflow-hidden" />
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <span className="text-sm">📡</span>
              </div>
              <h1 className="text-base font-bold text-zinc-100 tracking-tight">Hot Monitor</h1>
              {newCount > 0 && (
                <span className="neo-badge neo-badge-high text-[10px]">{newCount} 新热点</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <LogPopover api={api} />
              <button onClick={scanAll} disabled={scanning}
                className={`neo-btn text-xs ${scanning ? 'neo-btn-ghost opacity-50' : 'neo-btn-primary'}`}>
                {scanning ? '扫描中…' : '手动扫描'}
              </button>
              <button onClick={() => setShowSettings(true)}
                className="neo-btn neo-btn-ghost text-sm px-2.5" title="设置">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="max-w-6xl mx-auto px-5 pb-0">
            <nav className="flex gap-1">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg transition-all duration-200 border-b-2 -mb-[1px] ${
                    tab === t.key
                      ? 'text-zinc-100 border-accent-primary bg-accent-primary/5'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.02]'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-5 py-5 relative">
          {/* Stats always visible */}
          <div className="relative z-20">
            <StatsBar stats={stats} />
          </div>

          {/* Tab content */}
          <div className="relative z-20 mt-4">
            {tab === 'feed' && (
              <HotspotFeed hotspots={hotspots} />
            )}
            {tab === 'keywords' && (
              <KeywordManager keywords={keywords} onAdd={() => setShowAdd(true)} onToggle={toggleKw} onDelete={delKw} onUpdate={updateKw} />
            )}
            {tab === 'search' && (
              <SearchPanel api={api} />
            )}
          </div>
        </main>
      </div>

      {showAdd && <AddKeywordModal onClose={() => setShowAdd(false)} onAdd={addKeyword} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
