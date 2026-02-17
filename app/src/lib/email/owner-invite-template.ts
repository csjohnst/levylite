const BRAND_PRIMARY = '#02667F'
const BRAND_ACCENT = '#0090B7'

export interface OwnerInviteEmailData {
  ownerName: string
  schemeName: string
  lotNumber: string
  managerName: string
  activationUrl: string
}

export function buildOwnerInviteEmailHtml(data: OwnerInviteEmailData): string {
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
    .cta { display: inline-block; background: ${BRAND_ACCENT}; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; }
    .cta-wrapper { text-align: center; margin: 24px 0; }
    .footer { background: #f5f5f5; padding: 16px 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .footer p { margin: 0 0 4px 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>LevyLite</h2>
      <p>Owner Portal Invitation</p>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(data.ownerName)},</p>

      <p>You have been invited to access the owner portal for <strong>${escapeHtml(data.schemeName)}</strong> (Lot ${escapeHtml(data.lotNumber)}).</p>

      <p>The owner portal gives you online access to:</p>
      <ul>
        <li>View your levy statements and payment history</li>
        <li>Access scheme documents (AGM minutes, by-laws, insurance)</li>
        <li>Submit and track maintenance requests</li>
        <li>View meeting notices and minutes</li>
      </ul>

      <div class="cta-wrapper">
        <a href="${escapeHtml(data.activationUrl)}" class="cta">Activate My Account</a>
      </div>

      <p>This invitation was sent by ${escapeHtml(data.managerName)}. If you did not expect this email, you can safely ignore it.</p>

      <p>Thank you,<br>LevyLite</p>
    </div>
    <div class="footer">
      <p>This is an automated email from LevyLite. If you have questions about your strata scheme, please contact your strata manager.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildOwnerInviteEmailText(data: OwnerInviteEmailData): string {
  return `LevyLite - Owner Portal Invitation

Dear ${data.ownerName},

You have been invited to access the owner portal for ${data.schemeName} (Lot ${data.lotNumber}).

The owner portal gives you online access to:
- View your levy statements and payment history
- Access scheme documents (AGM minutes, by-laws, insurance)
- Submit and track maintenance requests
- View meeting notices and minutes

Activate your account here:
${data.activationUrl}

This invitation was sent by ${data.managerName}. If you did not expect this email, you can safely ignore it.

Thank you,
LevyLite`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
