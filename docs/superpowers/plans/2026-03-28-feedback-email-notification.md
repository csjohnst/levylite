# Feedback Email Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send an email to chris@levylite.com.au whenever a user submits feedback via the in-app widget, including all captured data.

**Architecture:** Add a new email template following the existing pattern (HTML + plain text pair with brand colours), then call Resend fire-and-forget after the existing DB insert in the `submitFeedback` server action.

**Tech Stack:** Next.js 15 server actions, Resend SDK, TypeScript

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/src/lib/email/feedback-notification-template.ts` | HTML + plain text email template for feedback notifications |
| Modify | `app/src/actions/feedback.ts` | Add fire-and-forget email send after DB insert |

---

### Task 1: Create the feedback notification email template

**Files:**
- Create: `app/src/lib/email/feedback-notification-template.ts`

- [ ] **Step 1: Create the template file with interface and both builders**

Create `app/src/lib/email/feedback-notification-template.ts` with this content:

```typescript
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

function fieldText(label: string, value: string | null | undefined): string {
  return value ? `${label}: ${value}` : ''
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

  const lines = [
    `NEW FEEDBACK — ${category} — ${sentiment}`,
    '',
    'MESSAGE:',
    data.message,
    '',
    '--- Page ---',
    fieldText('URL', data.pageUrl),
    fieldText('Title', data.pageTitle),
    '',
    '--- Contact ---',
    fieldText('Email', data.contactEmail),
    `Allow Contact: ${data.allowContact ? 'Yes' : 'No'}`,
    '',
    '--- Session & Device ---',
    fieldText('Fingerprint', data.userFingerprint),
    fieldText('Session ID', data.sessionId),
    fieldText('Viewport', viewport),
    fieldText('User Agent', data.userAgent),
    '',
    '--- Meta ---',
    `Feedback ID: ${data.feedbackId}`,
    `Submitted: ${data.createdAt}`,
    '',
    '---',
    'LevyLite feedback notification.',
  ]

  return lines.filter(l => l !== '').join('\n')
}
```

- [ ] **Step 2: Verify the file compiles**

Run from `app/`:
```bash
npx tsc --noEmit src/lib/email/feedback-notification-template.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/email/feedback-notification-template.ts
git commit -m "feat: add feedback notification email template"
```

---

### Task 2: Wire up email send in the submitFeedback server action

**Files:**
- Modify: `app/src/actions/feedback.ts`

- [ ] **Step 1: Add imports at top of file**

Add after the existing `import { z } from 'zod'` line in `app/src/actions/feedback.ts`:

```typescript
import { getResendClient } from '@/lib/email/resend'
import {
  buildFeedbackNotificationEmailHtml,
  buildFeedbackNotificationEmailText,
} from '@/lib/email/feedback-notification-template'
```

- [ ] **Step 2: Add fire-and-forget email send after DB insert**

In `app/src/actions/feedback.ts`, replace the final return block. Change:

```typescript
  return { success: true, feedbackId: feedback.id }
```

To:

```typescript
  // Fire-and-forget: notify Chris of new feedback
  const resend = getResendClient()
  if (resend) {
    const now = new Date().toISOString()
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>'
    const category = categoryName || 'uncategorised'
    const sentimentLabel = sentiment || 'no sentiment'

    resend.emails.send({
      from: fromEmail,
      to: 'chris@levylite.com.au',
      subject: `[LevyLite Feedback] ${category} — ${sentimentLabel}`,
      html: buildFeedbackNotificationEmailHtml({
        feedbackId: feedback.id,
        message,
        categoryName: categoryName || null,
        sentiment: sentiment || null,
        pageUrl,
        pageTitle: pageTitle || null,
        contactEmail: contactEmail || null,
        allowContact: allowContact ?? false,
        userFingerprint,
        sessionId: sessionId || null,
        viewportWidth: viewportWidth || null,
        viewportHeight: viewportHeight || null,
        userAgent: null,
        createdAt: now,
      }),
      text: buildFeedbackNotificationEmailText({
        feedbackId: feedback.id,
        message,
        categoryName: categoryName || null,
        sentiment: sentiment || null,
        pageUrl,
        pageTitle: pageTitle || null,
        contactEmail: contactEmail || null,
        allowContact: allowContact ?? false,
        userFingerprint,
        sessionId: sessionId || null,
        viewportWidth: viewportWidth || null,
        viewportHeight: viewportHeight || null,
        userAgent: null,
        createdAt: now,
      }),
    }).catch((err) => {
      console.error('[feedback] notification email failed:', err)
    })
  }

  return { success: true, feedbackId: feedback.id }
```

- [ ] **Step 3: Verify file compiles**

Run from `app/`:
```bash
npx tsc --noEmit src/actions/feedback.ts
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/actions/feedback.ts
git commit -m "feat: send email notification on feedback submission"
```

---

### Task 3: Manual integration test

- [ ] **Step 1: Start the dev server**

Run from `app/`:
```bash
npm run dev
```

- [ ] **Step 2: Submit test feedback**

Open the app in the browser, click the feedback widget, and submit a test entry with:
- Category: Bug
- Sentiment: Neutral
- Message: "Test feedback notification email — please ignore"
- Contact email: chris@levylite.com.au

- [ ] **Step 3: Verify email received**

Check chris@levylite.com.au inbox for an email with subject `[LevyLite Feedback] bug — neutral`. Verify all fields are present and correctly formatted in both the HTML rendering and the plain text fallback.

- [ ] **Step 4: Verify graceful degradation**

Temporarily unset `RESEND_API_KEY` in `.env.local`, restart dev server, submit feedback again. Verify:
- Feedback is stored in the database (check Supabase)
- Console shows `[resend] RESEND_API_KEY not set — email sending disabled`
- No error shown to the user
