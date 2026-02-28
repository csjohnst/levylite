import { notFound } from 'next/navigation'
import { getOrganisationDetail } from '@/actions/admin/admin-organisations'
import { OrganisationDetailClient } from '@/components/admin/organisation-detail-client'

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getOrganisationDetail(id)

  if ('error' in result || !result.data) {
    notFound()
  }

  return <OrganisationDetailClient organisation={result.data} />
}
