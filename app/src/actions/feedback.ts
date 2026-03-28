'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getResendClient } from '@/lib/email/resend'
import {
  buildFeedbackNotificationEmailHtml,
  buildFeedbackNotificationEmailText,
} from '@/lib/email/feedback-notification-template'

const feedbackSchema = z.object({
  message: z.string().min(10, 'Feedback must be at least 10 characters').max(5000),
  categoryName: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  pageUrl: z.string().url(),
  pageTitle: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  allowContact: z.boolean().optional(),
  userFingerprint: z.string().min(1),
  sessionId: z.string().optional(),
  viewportWidth: z.number().int().positive().optional(),
  viewportHeight: z.number().int().positive().optional(),
})

export type FeedbackFormData = z.infer<typeof feedbackSchema>

export async function submitFeedback(data: FeedbackFormData) {
  const parsed = feedbackSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { message, categoryName, sentiment, pageUrl, pageTitle, contactEmail, allowContact, userFingerprint, sessionId, viewportWidth, viewportHeight } = parsed.data

  // Look up category UUID by name if provided
  let categoryId: string | null = null
  if (categoryName) {
    const { data: cat } = await supabase
      .from('feedback_categories')
      .select('id')
      .eq('name', categoryName)
      .single()
    categoryId = cat?.id ?? null
  }

  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert({
      message,
      category_id: categoryId,
      sentiment: sentiment || null,
      page_url: pageUrl,
      page_title: pageTitle || null,
      contact_email: contactEmail || null,
      allow_contact: allowContact ?? false,
      user_fingerprint: userFingerprint,
      session_id: sessionId || null,
      viewport_width: viewportWidth || null,
      viewport_height: viewportHeight || null,
      user_agent: null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Feedback submission error:', error)
    return { error: 'Failed to submit feedback. Please try again.' }
  }

  // Fire-and-forget: notify Chris of new feedback
  const resend = getResendClient()
  if (resend) {
    const now = new Date().toISOString()
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>'
    const category = categoryName || 'uncategorised'
    const sentimentLabel = sentiment || 'no sentiment'

    const emailData = {
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
    }

    await resend.emails.send({
      from: fromEmail,
      to: 'chris@levylite.com.au',
      subject: `[LevyLite Feedback] ${category} — ${sentimentLabel}`,
      html: buildFeedbackNotificationEmailHtml(emailData),
      text: buildFeedbackNotificationEmailText(emailData),
    }).catch((err) => {
      console.error('[feedback] notification email failed:', err)
    })
  }

  return { success: true, feedbackId: feedback.id }
}
