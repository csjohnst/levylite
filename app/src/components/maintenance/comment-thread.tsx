'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { addComment } from '@/actions/maintenance-requests'

interface Comment {
  id: string
  comment_text: string
  is_internal: boolean
  created_by: string
  created_at: string
}

interface CommentThreadProps {
  requestId: string
  comments: Comment[]
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CommentThread({ requestId, comments }: CommentThreadProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      toast.error('Comment text is required')
      return
    }

    setLoading(true)
    const result = await addComment(requestId, text.trim(), isInternal)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Comment added')
      setText('')
      setIsInternal(false)
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
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`rounded-lg border p-3 text-sm ${
                  comment.is_internal
                    ? 'border-amber-200 bg-amber-50'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(comment.created_at)}
                  </span>
                  {comment.is_internal && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 border-amber-300">
                      <Lock className="mr-1 size-2.5" />
                      Internal
                    </Badge>
                  )}
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Lock className="size-3.5 text-muted-foreground" />
              Internal note (not visible to owners)
            </label>
            <Button type="submit" size="sm" disabled={loading || !text.trim()}>
              {loading ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
