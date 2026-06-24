export default function RadarScanner({ stats, keywords }) {
  const activeCount = stats.activeKeywords || 0;
  const recentCount = stats.recent24h || 0;

  // Generate random dot positions for active keywords
  const dots = keywords
    .filter(k => k.status === 'active')
    .slice(0, 6)
    .map((k, i) => ({
      id: k.id,
      x: 25 + Math.random() * 50,
      y: 25 + Math.random() * 50,
      delay: i * 0.5
    }));

  return (
    <div className="hud-frame rounded-xl p-6 flex flex-col items-center scan-line-overlay">
      <h3 className="text-xs font-mono text-cyber-cyan uppercase tracking-widest mb-4">
        📡 雷达监测
      </h3>

      {/* Radar Display */}
      <div className="radar-container">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="radar-circle" />
        ))}
        <div className="radar-scan" />
        {/* Signal dots */}
        {dots.map(d => (
          <div
            key={d.id}
            className="radar-dot"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              animationDelay: `${d.delay}s`
            }}
          />
        ))}
        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3">
          <div className="absolute inset-0 rounded-full border border-cyber-cyan/30" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyber-cyan/20" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-cyber-cyan/20" />
        </div>
      </div>

      {/* Status Info */}
      <div className="mt-6 w-full space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-hud-dim">监控频道</span>
          <span className="font-mono text-cyber-cyan">{activeCount}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-hud-dim">24h 热点</span>
          <span className="font-mono text-cyber-green">{recentCount}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-hud-dim">扫描状态</span>
          <span className="flex items-center gap-1.5">
            <span className="status-led online" />
            <span className="font-mono text-cyber-green text-xs">ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Decorative Terminal Text */}
      <div className="mt-4 pt-3 border-t border-cyber-border">
        <p className="font-mono text-[10px] text-hud-dim leading-relaxed">
          {`> SYS: MONITORING ${activeCount} CHANNELS
> FREQ: SCAN EVERY 30 MIN
> MODE: AI-VERIFIED
> STATUS: OPERATIONAL`}
        </p>
      </div>
    </div>
  );
}
