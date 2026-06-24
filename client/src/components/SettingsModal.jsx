import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    scan_interval: '30',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    notify_email: ''
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data && Object.keys(data).length) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('设置已保存');
      }
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
    setSaving(false);
  };

  const testEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    }
    setTesting(false);
  };

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-cyber-cyan">
            ⚙️ 系统设置
          </h2>
          <button onClick={onClose} className="text-hud-dim hover:text-cyber-pink transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Scan Settings */}
          <section>
            <h3 className="text-sm font-mono text-cyber-purple mb-3">📡 扫描设置</h3>
            <div>
              <label className="block text-xs text-hud-dim mb-1">扫描间隔 (分钟)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.scan_interval}
                onChange={e => update('scan_interval', e.target.value)}
                className="cyber-input w-full px-3 py-2 rounded-lg text-sm font-mono"
              />
              <p className="text-[10px] text-hud-dim mt-1">当前: 每 {settings.scan_interval} 分钟扫描一次</p>
            </div>
          </section>

          {/* Email Settings */}
          <section>
            <h3 className="text-sm font-mono text-cyber-purple mb-3">📧 邮件通知 (可选)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-hud-dim mb-1">SMTP 服务器</label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={e => update('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="cyber-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-hud-dim mb-1">端口</label>
                <input
                  type="number"
                  value={settings.smtp_port}
                  onChange={e => update('smtp_port', e.target.value)}
                  className="cyber-input w-full px-3 py-2 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-hud-dim mb-1">邮箱账号</label>
                <input
                  type="email"
                  value={settings.smtp_user}
                  onChange={e => update('smtp_user', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="cyber-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-hud-dim mb-1">邮箱密码/应用密码</label>
                <input
                  type="password"
                  value={settings.smtp_pass}
                  onChange={e => update('smtp_pass', e.target.value)}
                  placeholder="应用专用密码"
                  className="cyber-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-hud-dim mb-1">通知接收邮箱</label>
                <input
                  type="email"
                  value={settings.notify_email}
                  onChange={e => update('notify_email', e.target.value)}
                  placeholder="notify@example.com"
                  className="cyber-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={testEmail}
                disabled={testing || !settings.smtp_host}
                className="cyber-btn bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan px-4 py-2 rounded-lg text-sm hover:bg-cyber-cyan/20 disabled:opacity-50 transition-all"
              >
                {testing ? '测试中...' : '📤 发送测试邮件'}
              </button>
              {testResult && (
                <p className={`text-xs ${testResult.success ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                  {testResult.message}
                </p>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-cyber-border">
            <button
              onClick={onClose}
              className="flex-1 cyber-input px-4 py-2.5 rounded-lg text-sm text-hud-dim hover:text-hud-text transition-colors"
            >
              取消
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 cyber-btn bg-cyber-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-cyber-purple/80 disabled:opacity-50 transition-all"
            >
              {saving ? '保存中...' : '💾 保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
