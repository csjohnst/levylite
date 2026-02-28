import { CreditCard } from 'lucide-react'
import { getSubscriptions, getPlans } from '@/actions/admin/admin-subscriptions'
import { SubscriptionsTable } from '@/components/admin/subscriptions-table'

export default async function AdminSubscriptionsPage() {
  const [subsResult, plansResult] = await Promise.all([
    getSubscriptions(),
    getPlans(),
  ])

  if (subsResult.error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <div className="rounded-md border border-destructive/50 p-6 text-destructive text-sm">
          {subsResult.error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="size-6" />
          Subscriptions
        </h2>
        <p className="text-muted-foreground">
          Manage subscription plans and billing across all organisations.
        </p>
      </div>

      <SubscriptionsTable
        subscriptions={subsResult.data ?? []}
        plans={plansResult.data ?? []}
      />
    </div>
  )
}
