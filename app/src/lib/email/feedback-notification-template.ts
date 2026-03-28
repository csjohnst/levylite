const BRAND_PRIMARY = '#02667F'
const BRAND_ACCENT = '#0090B7'

export interface FeedbackNotificationEmailData {
  feedbackId: string
  message: string
  categoryName: string | null
  sentiment: string | null
  pageUrl: string
  pageTitle: string | null
  contactEmail: string | null
  allowContact: boolean
  userFingerprint: string
  sessionId: string | null
  viewportWidth: number | null
  viewportHeight: number | null
  userAgent: string | null
  createdAt: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function field(label: string, value: string | null | undefined): string {
  return value ? `<p style="margin:0 0 4px 0;font-size:14px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` : ''
}


export function buildFeedbackNotificationEmailHtml(data: FeedbackNotificationEmailData): string {
  const category = data.categoryName || 'uncategorised'
  const sentiment = data.sentiment || 'no sentiment'
  const viewport = data.viewportWidth && data.viewportHeight
    ? `${data.viewportWidth}x${data.viewportHeight}`
    : null

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: ${BRAND_PRIMARY}; color: white; padding: 24px 20px; }
    .header h2 { margin: 0 0 4px 0; font-size: 20px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 24px 20px; }
    .content p { line-height: 1.6; margin: 0 0 16px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: bold; margin-right: 6px; }
    .badge-category { background: #e0f2f7; color: ${BRAND_PRIMARY}; }
    .badge-sentiment { background: #f0f0f0; color: #555; }
    .message-box { background: #f8f9fa; border-left: 3px solid ${BRAND_ACCENT}; padding: 16px; margin: 16px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
    .details { background: #f8f9fa; padding: 12px 16px; margin: 16px 0; border-radius: 6px; }
    .details p { margin: 0 0 4px 0; font-size: 14px; line-height: 1.6; }
    .footer { background: #f5f5f5; padding: 16px 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .footer p { margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Feedback Received</h2>
      <p>${escapeHtml(category)} &middot; ${escapeHtml(sentiment)}</p>
    </div>
    <div class="content">
      <p>
        <span class="badge badge-category">${escapeHtml(category)}</span>
        <span class="badge badge-sentiment">${escapeHtml(sentiment)}</span>
      </p>

      <div class="message-box">${escapeHtml(data.message)}</div>

      <p><strong>Page</strong></p>
      <div class="details">
        ${field('URL', data.pageUrl)}
        ${field('Title', data.pageTitle)}
      </div>

      <p><strong>Contact</strong></p>
      <div class="details">
        ${field('Email', data.contactEmail)}
        ${field('Allow Contact', data.allowContact ? 'Yes' : 'No')}
      </div>

      <p><strong>Session &amp; Device</strong></p>
      <div class="details">
        ${field('Fingerprint', data.userFingerprint)}
        ${field('Session ID', data.sessionId)}
        ${field('Viewport', viewport)}
        ${field('User Agent', data.userAgent)}
      </div>

      <p><strong>Meta</strong></p>
      <div class="details">
        ${field('Feedback ID', data.feedbackId)}
        ${field('Submitted', data.createdAt)}
      </div>
    </div>
    <div class="footer">
      <p>LevyLite feedback notification. This email was sent automatically.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildFeedbackNotificationEmailText(data: FeedbackNotificationEmailData): string {
  const category = data.categoryName || 'uncategorised'
  const sentiment = data.sentiment || 'no sentiment'
  const viewport = data.viewportWidth && data.viewportHeight
    ? `${data.viewportWidth}x${data.viewportHeight}`
    : null

  const lines: string[] = []

  lines.push(`NEW FEEDBACK — ${category} — ${sentiment}`, '')
  lines.push('MESSAGE:', data.message, '')

  lines.push('--- Page ---')
  lines.push(`URL: ${data.pageUrl}`)
  if (data.pageTitle) lines.push(`Title: ${data.pageTitle}`)
  lines.push('')

  lines.push('--- Contact ---')
  if (data.contactEmail) lines.push(`Email: ${data.contactEmail}`)
  lines.push(`Allow Contact: ${data.allowContact ? 'Yes' : 'No'}`)
  lines.push('')

  lines.push('--- Session & Device ---')
  lines.push(`Fingerprint: ${data.userFingerprint}`)
  if (data.sessionId) lines.push(`Session ID: ${data.sessionId}`)
  if (viewport) lines.push(`Viewport: ${viewport}`)
  if (data.userAgent) lines.push(`User Agent: ${data.userAgent}`)
  lines.push('')

  lines.push('--- Meta ---')
  lines.push(`Feedback ID: ${data.feedbackId}`)
  lines.push(`Submitted: ${data.createdAt}`)
  lines.push('')

  lines.push('---')
  lines.push('LevyLite feedback notification. This email was sent automatically.')

  return lines.join('\n')
}
