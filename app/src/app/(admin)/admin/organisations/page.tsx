import { getOrganisations } from '@/actions/admin/admin-organisations'
import { OrganisationsTable } from '@/components/admin/organisations-table'

export default async function OrganisationsPage() {
  const result = await getOrganisations()

  if ('error' in result) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load organisations: {result.error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Organisations</h2>
        <p className="text-muted-foreground">
          Manage all organisations on the platform.
        </p>
      </div>
      <OrganisationsTable organisations={result.data ?? []} />
    </div>
  )
}
