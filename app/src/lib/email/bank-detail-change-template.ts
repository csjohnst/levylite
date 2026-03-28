const BRAND_PRIMARY = '#02667F'
const BRAND_ACCENT = '#0090B7'

export interface BankDetailChangeRequestEmailData {
  schemeName: string
  requesterName: string
  oldBsb: string | null
  oldAccountNumber: string | null
  oldAccountName: string | null
  newBsb: string | null
  newAccountNumber: string | null
  newAccountName: string | null
  expiresAt: string
  portalUrl: string
}

export interface BankDetailChangeApprovalEmailData {
  schemeName: string
  approverName: string
  newBsb: string | null
  newAccountNumber: string | null
  newAccountName: string | null
}

function formatDetail(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : `${label}: (not set)`
}

// --- Request notification email (sent to all managers) ---

export function buildBankDetailChangeRequestEmailHtml(data: BankDetailChangeRequestEmailData): string {
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
    .warning { background: #fef3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
    .warning strong { color: #856404; }
    .details { background: #f8f9fa; border-left: 3px solid ${BRAND_ACCENT}; padding: 12px 16px; margin: 16px 0; }
    .details p { margin: 0 0 4px 0; font-size: 14px; }
    .old-details { border-left-color: #dc3545; }
    .new-details { border-left-color: #28a745; }
    .cta { display: inline-block; background: ${BRAND_ACCENT}; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; }
    .cta-wrapper { text-align: center; margin: 24px 0; }
    .footer { background: #f5f5f5; padding: 16px 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .footer p { margin: 0 0 4px 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bank Detail Change Request</h2>
      <p>${escapeHtml(data.schemeName)}</p>
    </div>
    <div class="content">
      <div class="warning">
        <strong>Action Required:</strong> A bank detail change has been requested for <strong>${escapeHtml(data.schemeName)}</strong>. This request requires approval from a different manager before taking effect.
      </div>

      <p><strong>Requested by:</strong> ${escapeHtml(data.requesterName)}</p>

      <p><strong>Current Bank Details:</strong></p>
      <div class="details old-details">
        <p>${escapeHtml(formatDetail('BSB', data.oldBsb))}</p>
        <p>${escapeHtml(formatDetail('Account Number', data.oldAccountNumber))}</p>
        <p>${escapeHtml(formatDetail('Account Name', data.oldAccountName))}</p>
      </div>

      <p><strong>Proposed New Bank Details:</strong></p>
      <div class="details new-details">
        <p>${escapeHtml(formatDetail('BSB', data.newBsb))}</p>
        <p>${escapeHtml(formatDetail('Account Number', data.newAccountNumber))}</p>
        <p>${escapeHtml(formatDetail('Account Name', data.newAccountName))}</p>
      </div>

      <p>This request expires on <strong>${escapeHtml(data.expiresAt)}</strong>. Please review and approve or reject in the portal.</p>

      <div class="cta-wrapper">
        <a href="${escapeHtml(data.portalUrl)}" class="cta">Review Change Request</a>
      </div>

      <p style="font-size: 13px; color: #666;">If you did not expect this request, please contact your organisation administrator immediately. Unauthorised bank detail changes can redirect levy payments to fraudulent accounts.</p>
    </div>
    <div class="footer">
      <p>This is a security notification from LevyLite. Bank detail changes require dual authorisation to protect trust account integrity.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildBankDetailChangeRequestEmailText(data: BankDetailChangeRequestEmailData): string {
  return `BANK DETAIL CHANGE REQUEST - ${data.schemeName}

ACTION REQUIRED: A bank detail change has been requested for ${data.schemeName}. This request requires approval from a different manager before taking effect.

Requested by: ${data.requesterName}

Current Bank Details:
${formatDetail('BSB', data.oldBsb)}
${formatDetail('Account Number', data.oldAccountNumber)}
${formatDetail('Account Name', data.oldAccountName)}

Proposed New Bank Details:
${formatDetail('BSB', data.newBsb)}
${formatDetail('Account Number', data.newAccountNumber)}
${formatDetail('Account Name', data.newAccountName)}

This request expires on ${data.expiresAt}. Please review and approve or reject in the portal.

Review here: ${data.portalUrl}

If you did not expect this request, please contact your organisation administrator immediately. Unauthorised bank detail changes can redirect levy payments to fraudulent accounts.

---
This is a security notification from LevyLite. Bank detail changes require dual authorisation to protect trust account integrity.`
}

// --- Approval confirmation email (sent to all managers) ---

export function buildBankDetailChangeApprovalEmailHtml(data: BankDetailChangeApprovalEmailData): string {
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
    .success { background: #d4edda; border: 1px solid #28a745; border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
    .success strong { color: #155724; }
    .details { background: #f8f9fa; border-left: 3px solid #28a745; padding: 12px 16px; margin: 16px 0; }
    .details p { margin: 0 0 4px 0; font-size: 14px; }
    .footer { background: #f5f5f5; padding: 16px 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .footer p { margin: 0 0 4px 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bank Details Updated</h2>
      <p>${escapeHtml(data.schemeName)}</p>
    </div>
    <div class="content">
      <div class="success">
        <strong>Confirmed:</strong> Bank details for <strong>${escapeHtml(data.schemeName)}</strong> have been updated.
      </div>

      <p><strong>Approved by:</strong> ${escapeHtml(data.approverName)}</p>

      <p><strong>New Bank Details:</strong></p>
      <div class="details">
        <p>${escapeHtml(formatDetail('BSB', data.newBsb))}</p>
        <p>${escapeHtml(formatDetail('Account Number', data.newAccountNumber))}</p>
        <p>${escapeHtml(formatDetail('Account Name', data.newAccountName))}</p>
      </div>

      <p style="font-size: 13px; color: #666;">If you did not authorise this change, contact your organisation administrator immediately.</p>
    </div>
    <div class="footer">
      <p>This is a security notification from LevyLite. All bank detail changes are audited.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildBankDetailChangeApprovalEmailText(data: BankDetailChangeApprovalEmailData): string {
  return `BANK DETAILS UPDATED - ${data.schemeName}

Bank details for ${data.schemeName} have been updated.

Approved by: ${data.approverName}

New Bank Details:
${formatDetail('BSB', data.newBsb)}
${formatDetail('Account Number', data.newAccountNumber)}
${formatDetail('Account Name', data.newAccountName)}

If you did not authorise this change, contact your organisation administrator immediately.

---
This is a security notification from LevyLite. All bank detail changes are audited.`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
