import HotspotCard from './HotspotCard';

export default function HotspotFeed({ hotspots }) {
  return (
    <div className="glass-card p-4">
      <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-alert"></span>
        热点信号流
        {hotspots.length > 0 && <span className="text-xs font-mono text-zinc-500 font-normal">{hotspots.length} 条</span>}
      </h2>

      {hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-700">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-full border border-accent-primary/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full border border-accent-primary/15" />
            <div className="absolute inset-[14px] rounded-full bg-accent-primary/5" />
          </div>
          <p className="text-sm">等待热点信号…</p>
          <p className="text-xs mt-1 text-zinc-600">添加关键词后自动监测</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[540px] overflow-y-auto custom-scroll pr-0.5">
          {hotspots.map((hs, i) => (
            <HotspotCard key={hs.id} hotspot={hs} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
