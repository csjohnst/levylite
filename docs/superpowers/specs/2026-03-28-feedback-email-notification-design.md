# Feedback Email Notification

**Date:** 2026-03-28
**Status:** Draft

## Summary

Send an email notification to Chris whenever a user submits feedback via the in-app widget. The email includes all captured data so feedback can be triaged from the inbox without needing to query Supabase directly.

## Approach

Add the email send directly in the existing `submitFeedback` server action, matching the pattern used by levy notices, bank detail changes, and owner invitations. Fire-and-forget so the user's submission is never blocked by email delivery.

## Changes

### New file: `app/src/lib/email/feedback-notification-template.ts`

Exports two functions following the existing template pattern:

- `buildFeedbackNotificationEmailHtml(data: FeedbackNotificationEmailData): string`
- `buildFeedbackNotificationEmailText(data: FeedbackNotificationEmailData): string`

**Interface:**

```typescript
interface FeedbackNotificationEmailData {
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
  createdAt: string // ISO timestamp
}
```

**Email content:**

- Subject: `[LevyLite Feedback] {category} — {sentiment}` (falls back to "uncategorised" / "no sentiment" when null)
- From: `process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>'`
- To: Hardcoded Chris's email address
- Body sections (all fields, labelled):
  - Category and sentiment (top, prominent)
  - Message (full text)
  - Page URL and page title
  - Contact email and allow-contact flag
  - User fingerprint, session ID
  - Viewport dimensions, user agent
  - Feedback ID and timestamp
- HTML version uses the existing brand styling (primary `#02667F`, accent `#0090B7`)
- Plain text version is a simple labelled list

### Modified file: `app/src/actions/feedback.ts`

After the successful DB insert (where we already have the feedback ID):

1. Import `getResendClient` and the template builders
2. Build email HTML and text from the submitted data + feedback ID + timestamp
3. Fire-and-forget: `resend.emails.send(...).catch(err => console.error('[feedback] notification email failed:', err))`
4. The existing return (feedback ID to the client) is unaffected

No new environment variables. Uses existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

## What does not change

- No database schema changes
- No new API routes
- No new environment variables
- No changes to the feedback widget UI
- No changes to RLS policies
- Feedback submission succeeds even if email fails

## Testing

- Submit feedback via the widget in dev with `RESEND_API_KEY` set — verify email arrives
- Submit feedback with `RESEND_API_KEY` unset — verify submission still succeeds, warning logged
- Verify all fields appear in the email (category, sentiment, message, URL, title, contact email, fingerprint, session, viewport, user agent, ID, timestamp)
