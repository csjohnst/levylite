import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FileText } from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { OwnerDocumentsClient } from '@/components/owner/owner-documents-client'

export default async function OwnerDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // Get owner record
  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('portal_user_id', user.id)
    .single()

  if (!owner) redirect('/owner/login')

  // Get owner's scheme IDs via lot_ownerships
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lots(scheme_id)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const schemeIds = [
    ...new Set(
      (ownerships ?? [])
        .map((o) => {
          const lot = o.lots as unknown as { scheme_id: string }
          return lot?.scheme_id
        })
        .filter(Boolean)
    ),
  ]

  // Fetch documents visible to owners
  let documents: Array<{
    id: string
    document_name: string
    description: string | null
    category: string | null
    file_size: number | null
    mime_type: string | null
    file_path: string
    created_at: string
    scheme_id: string
  }> = []

  if (schemeIds.length > 0) {
    const { data } = await supabase
      .from('documents')
      .select('id, document_name, description, category, file_size, mime_type, file_path, created_at, scheme_id')
      .in('scheme_id', schemeIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    documents = data ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
        <p className="text-muted-foreground">
          Scheme documents available to you
        </p>
      </div>

      {documents.length > 0 ? (
        <OwnerDocumentsClient documents={documents} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No documents available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No documents have been shared for your scheme yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
