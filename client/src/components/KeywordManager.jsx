export default function KeywordManager({ keywords, onAdd, onToggle, onDelete, onScan }) {
  return (
    <div className="hud-frame rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-cyber-cyan uppercase tracking-widest">
          🎯 监控频道
        </h3>
        <button
          onClick={onAdd}
          className="cyber-btn bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple px-3 py-1 rounded text-xs hover:bg-cyber-purple/30 transition-all"
        >
          + 添加
        </button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {keywords.length === 0 ? (
          <div className="text-center py-8 text-hud-dim">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-sm">暂无监控关键词</p>
            <p className="text-xs mt-1">点击"添加"开始监测热点</p>
          </div>
        ) : (
          keywords.map(kw => (
            <div
              key={kw.id}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                kw.status === 'active'
                  ? 'border-cyber-border bg-cyber-panel/50 hover:border-cyber-cyan/30'
                  : 'border-cyber-border/30 bg-cyber-panel/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`status-led ${kw.status === 'active' ? 'online' : 'idle'}`} />
                  <span className="font-semibold text-sm text-hud-text">
                    {kw.keyword}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onScan(kw.id)}
                    className="text-hud-dim hover:text-cyber-cyan p-1 text-xs"
                    title="手动扫描"
                  >
                    🔍
                  </button>
                  <button
                    onClick={() => onToggle(kw.id, kw.status === 'active' ? 'paused' : 'active')}
                    className="text-hud-dim hover:text-cyber-green p-1 text-xs"
                    title={kw.status === 'active' ? '暂停' : '激活'}
                  >
                    {kw.status === 'active' ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => onDelete(kw.id)}
                    className="text-hud-dim hover:text-cyber-pink p-1 text-xs"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-hud-dim">
                {kw.scope && (
                  <span className="bg-cyber-purple/10 text-cyber-purple px-1.5 py-0.5 rounded">
                    {kw.scope}
                  </span>
                )}
                <span>🔥 {kw.hotspot_count || 0} 条</span>
                {kw.last_detected && (
                  <span className="hidden sm:inline">
                    最近: {new Date(kw.last_detected).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>

              {/* Signal strength visualizer for active keywords */}
              {kw.status === 'active' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-hud-dim">信号</span>
                  <div className="signal-bar">
                    <span /><span /><span /><span /><span />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
