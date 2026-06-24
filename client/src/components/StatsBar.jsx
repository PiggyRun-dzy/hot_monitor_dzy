import GlowingEffect from './ui/GlowingEffect';
import ShootingStar from './ui/ShootingStar';

export default function StatsBar({ stats }) {
  const items = [
    { label: '关键词', value: stats.totalKeywords || 0, icon: '🎯' },
    { label: '热点',   value: stats.totalHotspots || 0, icon: '🔥' },
    { label: '24h',    value: stats.recent24h || 0,     icon: '⏱' },
    { label: 'AI验证',  value: stats.verified || 0,      icon: '✓' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <GlowingEffect key={i} glowColor="rgba(99,102,241,0.15)">
          <div className="stat-card rounded-[13px] animate-fade-up overflow-hidden relative" style={{ animationDelay: `${i * 80}ms` }}>
            <ShootingStar />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{item.icon}</span>
                <span className="stat-label !mt-0">{item.label}</span>
                <span className="relative inline-flex ml-auto"><span className="pulse-dot" /></span>
              </div>
              <div className="stat-value">{item.value}</div>
            </div>
          </div>
        </GlowingEffect>
      ))}
    </div>
  );
}
