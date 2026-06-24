import HotspotCard from './HotspotCard';

export default function HotspotFeed({ hotspots }) {
  return (
    <div className="hud-frame rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-cyber-cyan uppercase tracking-widest">
          🔥 热点信号流
        </h3>
        <span className="text-[10px] font-mono text-hud-dim">
          {hotspots.length} 条信号
        </span>
      </div>

      {hotspots.length === 0 ? (
        <div className="text-center py-12 text-hud-dim">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border border-cyber-cyan/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full border border-cyber-cyan/20" />
            <div className="absolute inset-1/3 rounded-full bg-cyber-cyan/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyber-cyan/30" />
          </div>
          <p className="text-sm">等待热点信号...</p>
          <p className="text-xs mt-1">系统正在监听关键词变化</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {hotspots.map((hs, i) => (
            <HotspotCard key={hs.id} hotspot={hs} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
