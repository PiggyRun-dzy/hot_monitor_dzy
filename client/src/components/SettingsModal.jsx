import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({ scan_interval: '30', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', notify_email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(d => { if (d && Object.keys(d).length) setSettings(p => ({ ...p, ...d })); }).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try { await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }); alert('已保存'); } catch { alert('保存失败'); }
    setSaving(false);
  };
  const upd = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel animate-fade-up">
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
