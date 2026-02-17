import { User, AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getOwnerProfile } from '@/actions/owner-profile'
import { OwnerProfileForm } from '@/components/owner/owner-profile-form'

export default async function OwnerProfilePage() {
  const result = await getOwnerProfile()

  if ('error' in result && !('data' in result)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Unable to load profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profile = result.data!
  const ownerships = (profile.lot_ownerships ?? []) as unknown as Array<{
    lot_id: string
    ownership_type: string | null
    ownership_percentage: number | null
    lots: {
      id: string
      lot_number: string
      unit_number: string | null
      schemes: { id: string; scheme_name: string }
    }
  }>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Your account and contact information
        </p>
      </div>

      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Account Details
          </CardTitle>
          <CardDescription>
            Contact your manager to change your name or email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-sm font-medium">
                {[profile.title, profile.first_name, profile.middle_name, profile.last_name]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            {profile.preferred_name && (
              <div>
                <p className="text-sm text-muted-foreground">Preferred Name</p>
                <p className="text-sm font-medium">{profile.preferred_name}</p>
              </div>
            )}
            {profile.company_name && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{profile.company_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Editable contact details */}
      <OwnerProfileForm profile={profile} />

      {/* Lot information (read-only) */}
      {ownerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Lots</CardTitle>
            <CardDescription>Properties you own across schemes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Ownership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerships.map((ownership) => {
                    const lot = ownership.lots as unknown as {
                      id: string
                      lot_number: string
                      unit_number: string | null
                      schemes: { id: string; scheme_name: string }
                    }
                    return (
                      <TableRow key={ownership.lot_id}>
                        <TableCell className="text-sm font-medium">
                          {lot.schemes?.scheme_name ?? 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lot.lot_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lot.unit_number ?? '--'}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {ownership.ownership_type?.replace(/_/g, ' ') ?? 'Owner'}
                          {ownership.ownership_percentage
                            ? ` (${ownership.ownership_percentage}%)`
                            : ''}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
