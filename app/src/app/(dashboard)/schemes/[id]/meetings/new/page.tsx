import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MeetingForm } from '@/components/meetings/meeting-form'

export default async function NewMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Meeting</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/meetings`} className="hover:underline">Meetings</Link>
            {' '}&mdash; New
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/meetings`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>

      <MeetingForm schemeId={id} />
    </div>
  )
}
