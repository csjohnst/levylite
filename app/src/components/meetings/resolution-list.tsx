'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Resolution {
  id: string
  resolution_number: string | null
  motion_text: string
  resolution_type: string
  moved_by: string | null
  seconded_by: string | null
  votes_for: number
  votes_against: number
  votes_abstain: number
  result: string
  result_percentage: number | null
  discussion_notes: string | null
  agenda_item_id: string | null
}

interface ResolutionListProps {
  resolutions: Resolution[]
}

const RESULT_STYLES: Record<string, string> = {
  carried: 'bg-green-100 text-green-800',
  defeated: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  deferred: 'bg-yellow-100 text-yellow-800',
}

const TYPE_LABELS: Record<string, string> = {
  ordinary: 'Ordinary',
  special: 'Special',
  unanimous: 'Unanimous',
}

export function ResolutionList({ resolutions }: ResolutionListProps) {
  if (resolutions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No resolutions recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {resolutions.map((res, index) => {
        const totalVotes = res.votes_for + res.votes_against
        const percentage = totalVotes > 0
          ? ((res.votes_for / totalVotes) * 100).toFixed(1)
          : '0.0'

        return (
          <Card key={res.id}>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {res.resolution_number && (
                      <span className="text-sm font-mono text-muted-foreground">
                        {res.resolution_number}
                      </span>
                    )}
                    <Badge variant="outline">
                      {TYPE_LABELS[res.resolution_type] ?? res.resolution_type}
                    </Badge>
                  </div>
                  <p className="font-medium">{res.motion_text}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={RESULT_STYLES[res.result] ?? ''}
                >
                  {res.result.charAt(0).toUpperCase() + res.result.slice(1)}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {res.moved_by && <span>Moved: {res.moved_by}</span>}
                {res.seconded_by && <span>Seconded: {res.seconded_by}</span>}
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-700 font-medium">For: {res.votes_for}</span>
                <span className="text-red-700 font-medium">Against: {res.votes_against}</span>
                <span className="text-muted-foreground">Abstain: {res.votes_abstain}</span>
                <span className="text-muted-foreground">({percentage}%)</span>
              </div>

              {res.discussion_notes && (
                <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                  {res.discussion_notes}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
