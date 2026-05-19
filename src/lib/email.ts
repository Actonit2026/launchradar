import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = 'LaunchRadar <alerts@launchradar.app>'

interface AlertEmailProps {
  toEmail: string
  competitorName: string
  changes: Array<{
    page_type: string
    page_url: string
    diff_summary: string
    severity: string
    created_at: string
  }>
}

export async function sendAlertEmail({ toEmail, competitorName, changes }: AlertEmailProps) {
  const severityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#6b7a8d',
  }

  const changesHtml = changes.map(c => `
    <div style="border:1px solid #1E242C;border-radius:8px;padding:16px;margin-bottom:12px;background:#111418;">
      <div style="margin-bottom:8px;">
        <span style="color:${severityColors[c.severity] ?? '#6b7a8d'};font-family:monospace;font-size:11px;text-transform:uppercase;">${c.severity}</span>
        <span style="color:#6b7a8d;font-family:monospace;font-size:12px;margin-left:8px;">${c.page_type}</span>
      </div>
      <p style="color:#E8EDF2;font-size:14px;margin:0 0 8px 0;line-height:1.5;">${c.diff_summary}</p>
      <a href="${c.page_url}" style="color:#00FF94;font-family:monospace;font-size:12px;">${c.page_url}</a>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0C0F;margin:0;padding:0;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;">
      <span style="color:#00FF94;font-family:monospace;font-size:16px;font-weight:600;">◎ LaunchRadar</span>
    </div>
    <h1 style="color:#E8EDF2;font-size:22px;font-weight:700;margin:0 0 8px 0;">${competitorName} changed something</h1>
    <p style="color:#6b7a8d;font-size:14px;margin:0 0 24px 0;">${changes.length} change${changes.length !== 1 ? 's' : ''} detected.</p>
    ${changesHtml}
    <div style="margin-top:24px;text-align:center;">
      <a href="https://launchradarclaude.vercel.app/dashboard" style="display:inline-block;background:#00FF94;color:#0A0C0F;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">View in dashboard →</a>
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #1E242C;text-align:center;">
      <p style="color:#6b7a8d;font-size:12px;margin:0;">You're receiving this because you track ${competitorName} on LaunchRadar.</p>
    </div>
  </div>
</body>
</html>`

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `◎ ${competitorName} changed their ${changes[0]?.page_type ?? 'page'}`,
    html,
  })

  if (error) throw error
  return data
}
