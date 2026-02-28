import { Users } from 'lucide-react'
import { getUsers } from '@/actions/admin/admin-users'
import { UsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  const { data: users, error } = await getUsers()

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <div className="rounded-md border border-destructive/50 p-6 text-destructive text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="size-6" />
          Users
        </h2>
        <p className="text-muted-foreground">
          Manage all platform users across organisations.
        </p>
      </div>

      <UsersTable users={users ?? []} />
    </div>
  )
}
