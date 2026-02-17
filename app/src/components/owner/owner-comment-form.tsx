'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { addMaintenanceComment } from '@/actions/owner-maintenance'

interface Comment {
  id: string
  comment_text: string
  is_internal: boolean
  created_by: string
  created_at: string
}

interface OwnerCommentFormProps {
  requestId: string
  comments: Comment[]
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OwnerCommentForm({ requestId, comments }: OwnerCommentFormProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      toast.error('Comment text is required')
      return
    }

    setLoading(true)
    const result = await addMaintenanceComment(requestId, text.trim())
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Comment added')
      setText('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="size-4" />
          Comments ({comments.length})
        </CardTitle>
        <CardDescription>Discussion and updates for this request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border p-3 text-sm bg-muted/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{comment.comment_text}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="comment">Add Comment</Label>
            <Textarea
              id="comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your comment..."
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={loading || !text.trim()}>
              {loading ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
