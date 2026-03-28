'use client'

import * as React from 'react'
import { MessageSquarePlus, Bug, Lightbulb, Palette, FileText, Zap, MessageCircle, Send, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitFeedback } from '@/actions/feedback'
import type { FeedbackSentiment } from '@/lib/types'
import { toast } from 'sonner'

const CATEGORIES = [
  { id: 'bug', name: 'Bug', icon: Bug, color: '#EF4444' },
  { id: 'feature', name: 'Feature', icon: Lightbulb, color: '#3B82F6' },
  { id: 'ux', name: 'UX', icon: Palette, color: '#8B5CF6' },
  { id: 'content', name: 'Content', icon: FileText, color: '#F59E0B' },
  { id: 'performance', name: 'Speed', icon: Zap, color: '#10B981' },
  { id: 'other', name: 'Other', icon: MessageCircle, color: '#6B7280' },
] as const

const SENTIMENTS: { value: FeedbackSentiment; icon: typeof ThumbsUp; label: string }[] = [
  { value: 'positive', icon: ThumbsUp, label: 'Positive' },
  { value: 'neutral', icon: Minus, label: 'Neutral' },
  { value: 'negative', icon: ThumbsDown, label: 'Negative' },
]

function getFingerprint(): string {
  // Simple browser fingerprint — not tracking, just deduplication
  const nav = typeof navigator !== 'undefined' ? navigator : null
  const screen = typeof window !== 'undefined' ? window.screen : null
  const raw = [
    nav?.userAgent ?? '',
    nav?.language ?? '',
    screen?.width ?? 0,
    screen?.height ?? 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function FeedbackWidget() {
  const [open, setOpen] = React.useState(false)
  const [category, setCategory] = React.useState<string>('')
  const [sentiment, setSentiment] = React.useState<FeedbackSentiment | ''>('')
  const [message, setMessage] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [allowContact, setAllowContact] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const reset = () => {
    setCategory('')
    setSentiment('')
    setMessage('')
    setEmail('')
    setAllowContact(false)
    setSubmitted(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.length < 10) {
      toast.error('Please write at least 10 characters')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitFeedback({
        message,
        categoryName: category || undefined,
        sentiment: sentiment || undefined,
        pageUrl: window.location.href,
        pageTitle: document.title,
        contactEmail: email || undefined,
        allowContact,
        userFingerprint: getFingerprint(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmitted(true)
        toast.success('Thanks for your feedback!')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset after animation
    setTimeout(reset, 200)
  }

  return (
    <>
      {/* Floating trigger button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{submitted ? 'Thank you!' : 'Send Feedback'}</DialogTitle>
            <DialogDescription>
              {submitted
                ? 'Your feedback helps us improve LevyLite.'
                : 'Tell us what you think — bugs, ideas, anything.'}
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                We read every piece of feedback. If you left your email, we may follow up.
              </p>
              <Button onClick={handleClose} variant="outline">Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category pills */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const selected = category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(selected ? '' : cat.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                          selected
                            ? 'border-transparent text-white'
                            : 'border-border bg-background hover:bg-accent text-foreground'
                        }`}
                        style={selected ? { backgroundColor: cat.color } : undefined}
                      >
                        <Icon className="h-3 w-3" />
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">How are you feeling?</Label>
                <div className="flex gap-2">
                  {SENTIMENTS.map((s) => {
                    const Icon = s.icon
                    const selected = sentiment === s.value
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSentiment(selected ? '' : s.value)}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors border ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="feedback-message" className="text-xs text-muted-foreground">
                  Your feedback <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  className="mt-1.5 min-h-24"
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {message.length}/5000
                </p>
              </div>

              {/* Optional email */}
              <div>
                <Label htmlFor="feedback-email" className="text-xs text-muted-foreground">
                  Email (optional — if you want a reply)
                </Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (e.target.value) setAllowContact(true)
                    else setAllowContact(false)
                  }}
                  placeholder="you@example.com"
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || message.length < 10}>
                {submitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
