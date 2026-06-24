import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize email transporter (call when settings are configured).
 */
export function initEmail(host, port, user, pass) {
  if (!host || !user || !pass) return false;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: false,
    auth: { user, pass }
  });
  return true;
}

/**
 * Send notification email for new hotspots.
 */
export async function sendNotification(to, hotspots, aiSummary) {
  if (!transporter) {
    console.log('[Notifier] Email not configured, skipping notification.');
    return false;
  }

  const itemsHtml = hotspots.map(h => `
    <div style="margin-bottom:16px;padding:12px;border-left:3px solid #7C3AED;background:#1a1a2e;">
      <a href="${h.url}" style="color:#00FFFF;text-decoration:none;font-size:16px;font-weight:bold;">${h.title}</a>
      <p style="color:#aaa;margin:4px 0;font-size:13px;">📊 相关度: ${h.relevance_score}/100 | 关键词: ${h.keyword}</p>
      <p style="color:#ccc;margin:0;">${h.summary || ''}</p>
    </div>
  `).join('');

  try {
    await transporter.sendMail({
      from: transporter.options.auth.user,
      to,
      subject: `🔥 Hot Monitor - ${hotspots.length} 条新热点`,
      html: `
        <div style="background:#0A0E27;color:#E0E0E0;padding:24px;font-family:Arial,sans-serif;max-width:600px;">
          <h1 style="color:#00FFFF;border-bottom:1px solid #333;padding-bottom:12px;">🔥 Hot Monitor 热点通知</h1>
          <p style="color:#ccc;">${aiSummary}</p>
          ${itemsHtml}
          <p style="color:#666;font-size:12px;margin-top:24px;">由 Hot Monitor 自动发送 · ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    });
    console.log(`[Notifier] Email sent to ${to}: ${hotspots.length} hotspots`);
    return true;
  } catch (error) {
    console.error('[Notifier] Failed to send email:', error.message);
    return false;
  }
}

/**
 * Test email configuration.
 */
export async function testEmailConfig(host, port, user, pass, to) {
  const testTransporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: false,
    auth: { user, pass }
  });

  await testTransporter.sendMail({
    from: user,
    to,
    subject: 'Hot Monitor - 测试邮件',
    text: '如果你收到这封邮件，说明邮件配置成功！'
  });
}

export default { initEmail, sendNotification, testEmailConfig };
