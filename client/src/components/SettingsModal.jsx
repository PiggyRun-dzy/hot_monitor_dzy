import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    scan_interval: '30', min_score_engine: '70', min_score_community: '55', max_age_days: '7',
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', notify_email: ''
  });
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalReport, setEvalReport] = useState(null);
  const [evalSampleSize, setEvalSampleSize] = useState('20');

  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(d => { if (d && Object.keys(d).length) setSettings(p => ({ ...p, ...d })); }).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try { await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }); alert('已保存'); } catch { alert('保存失败'); }
    setSaving(false);
  };
  const upd = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const runEvaluation = async () => {
    setEvaluating(true);
    setEvalReport(null);
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleSize: parseInt(evalSampleSize) || 20 })
      });
      const data = await res.json();
      setEvalReport(data);
    } catch (e) {
      setEvalReport({ error: '评估失败: ' + e.message });
    }
    setEvaluating(false);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel animate-fade-up max-h-[85vh] overflow-y-auto custom-scroll">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-100">系统设置</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-mono text-accent-primary mb-3 uppercase tracking-wider">扫描设置</h3>
            <label className="block text-xs text-zinc-500 mb-1">扫描间隔（分钟）</label>
            <input type="number" min="5" max="120" value={settings.scan_interval} onChange={e => upd('scan_interval', e.target.value)} className="neo-input w-28 font-mono text-sm" />
          </section>

          <section>
            <h3 className="text-xs font-mono text-accent-primary mb-3 uppercase tracking-wider">过滤阈值</h3>
            <p className="text-[11px] text-zinc-600 mb-3">综合分 = (相关性 + 重要性 + 时效) / 3，低于阈值不入库</p>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400">搜索引擎源最低分（Bing/Google/DDG/搜狗）</label>
                <span className="text-xs font-mono text-accent-primary">{settings.min_score_engine || '70'}</span>
              </div>
              <input type="range" min="50" max="90" step="5" value={settings.min_score_engine || 70}
                onChange={e => upd('min_score_engine', e.target.value)}
                className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:cursor-pointer" />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5"><span>50 宽松</span><span>推荐 70</span><span>90 严格</span></div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400">社区源最低分（HN/B站/GitHub/掘金/微博）</label>
                <span className="text-xs font-mono text-accent-primary">{settings.min_score_community || '55'}</span>
              </div>
              <input type="range" min="40" max="80" step="5" value={settings.min_score_community || 55}
                onChange={e => upd('min_score_community', e.target.value)}
                className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:cursor-pointer" />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5"><span>40 宽松</span><span>推荐 55</span><span>80 严格</span></div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400">内容最大天数（超过则丢弃）</label>
                <span className="text-xs font-mono text-accent-primary">{settings.max_age_days || '7'} 天</span>
              </div>
              <input type="range" min="3" max="30" step="1" value={settings.max_age_days || 7}
                onChange={e => upd('max_age_days', e.target.value)}
                className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:cursor-pointer" />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5"><span>3 天（严格）</span><span>推荐 7 天</span><span>30 天（宽松）</span></div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-mono text-accent-primary mb-3 uppercase tracking-wider">AI 审核准确度评估</h3>
            <p className="text-[11px] text-zinc-500 mb-3">让 AI 回顾历史审核记录并重新评估，发现判断偏差，辅助优化审核策略。</p>

            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-zinc-400">抽样数量</label>
              <select value={evalSampleSize} onChange={e => setEvalSampleSize(e.target.value)}
                className="neo-input w-24 font-mono text-sm">
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="30">30 条</option>
                <option value="50">50 条</option>
              </select>
              <button onClick={runEvaluation} disabled={evaluating}
                className="neo-btn neo-btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
                {evaluating ? '评估中…' : '开始评估'}
              </button>
            </div>

            {evalReport && !evalReport.error && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-zinc-400">样本数: <strong className="text-zinc-200">{evalReport.sampleSize}</strong></span>
                  {evalReport.summary && (
                    <>
                      <span className="text-xs text-emerald-400">一致: <strong>{evalReport.summary.consistent}</strong></span>
                      <span className="text-xs text-amber-400">偏差: <strong>{evalReport.summary.discrepant}</strong></span>
                      <span className="text-xs text-rose-400">高估: <strong>{evalReport.summary.overrated}</strong></span>
                      <span className="text-xs text-blue-400">低估: <strong>{evalReport.summary.underrated}</strong></span>
                      <span className="text-xs text-accent-primary font-mono">准确率: <strong>{evalReport.summary.accuracyPercentage}%</strong></span>
                    </>
                  )}
                </div>
                {evalReport.summary?.keyFindings && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="text-zinc-500">主要发现：</span>{evalReport.summary.keyFindings}
                  </p>
                )}
                {evalReport.reviews && evalReport.reviews.filter(r => r.verdict !== 'consistent').length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">查看偏差详情 ({evalReport.reviews.filter(r => r.verdict !== 'consistent').length} 条)</summary>
                    <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto custom-scroll">
                      {evalReport.reviews.filter(r => r.verdict !== 'consistent').map(r => (
                        <div key={r.index} className="text-[10px] text-zinc-500 bg-white/[0.02] rounded p-1.5 leading-relaxed">
                          <span className={r.verdict === 'overrated' ? 'text-rose-400' : 'text-blue-400'}>
                            [{r.verdict === 'overrated' ? '高估' : '低估'}]
                          </span>
                          {' '}#{r.index}: {r.discrepancy}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {evalReport?.error && (
              <p className="text-xs text-rose-400">{evalReport.error}</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-mono text-accent-primary mb-3 uppercase tracking-wider">邮件通知（可选）</h3>
            {['smtp_host','smtp_user','smtp_pass','notify_email'].map(key => (
              <div key={key} className="mb-2">
                <label className="block text-xs text-zinc-500 mb-1 capitalize">{key.replace('_',' ')}</label>
                <input type={key.includes('pass') ? 'password' : 'text'} value={settings[key]} onChange={e => upd(key, e.target.value)}
                  placeholder={key === 'smtp_host' ? 'smtp.gmail.com' : key === 'smtp_user' ? 'your@email.com' : ''} className="neo-input w-full text-sm" />
              </div>
            ))}
          </section>

          <div className="flex gap-3 pt-2 border-t border-white/[0.04]">
            <button onClick={onClose} className="flex-1 neo-btn neo-btn-ghost justify-center py-2.5">取消</button>
            <button onClick={save} disabled={saving} className="flex-1 neo-btn neo-btn-primary justify-center py-2.5 disabled:opacity-40">{saving ? '保存中…' : '保存设置'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
