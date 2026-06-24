export default function StatsHUD({ stats, logs }) {
  const statItems = [
    { label: '总关键词', value: stats.totalKeywords || 0, icon: '🎯', color: 'text-cyber-cyan' },
    { label: '活跃监控', value: stats.activeKeywords || 0, icon: '📡', color: 'text-cyber-green' },
    { label: '总热点数', value: stats.totalHotspots || 0, icon: '🔥', color: 'text-cyber-pink' },
    { label: 'AI 验证', value: stats.verified || 0, icon: '🤖', color: 'text-cyber-purple' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statItems.map((item, i) => (
          <div
            key={i}
            className="hud-frame rounded-lg p-4 flex flex-col justify-between hover:border-cyber-cyan/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className="status-led online" />
            </div>
            <div className={`text-2xl font-bold font-mono ${item.color}`}>
              {item.value}
            </div>
            <div className="text-xs text-hud-dim mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Terminal Log */}
      <div className="hud-frame rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono text-cyber-cyan uppercase tracking-widest">
            💻 系统日志
          </h3>
          <span className="text-[10px] font-mono text-hud-dim">
            {logs.length} 条记录
          </span>
        </div>
        <div className="terminal-log max-h-48 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <p className="text-hud-dim italic">等待首次扫描...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="log-time shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('zh-CN')}
                </span>
                <span className={log.type === 'cycle' ? 'log-success' : 'log-info'}>
                  {log.type === 'cycle' ? '●' : '○'} {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
