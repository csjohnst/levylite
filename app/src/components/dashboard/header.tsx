'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { User } from '@supabase/supabase-js'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/schemes': 'Schemes',
  '/schemes/new': 'New Scheme',
  '/owners': 'Owners',
  '/levies': 'Levies',
  '/payments': 'Payments',
  '/trust': 'Trust Accounting',
  '/meetings': 'Meetings',
  '/maintenance': 'Maintenance',
  '/tradespeople': 'Tradespeople',
  '/documents': 'Documents',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]

  if (pathname.match(/^\/schemes\/[^/]+$/)) return 'Scheme Details'
  if (pathname.match(/^\/schemes\/[^/]+\/edit$/)) return 'Edit Scheme'
  if (pathname.startsWith('/settings/')) return 'Settings'
  if (pathname.startsWith('/trust/')) return 'Trust Accounting'
  if (pathname.startsWith('/levies/')) return 'Levies'
  if (pathname.startsWith('/maintenance/')) return 'Maintenance'
  if (pathname.startsWith('/meetings/')) return 'Meetings'

  return 'Dashboard'
}

function getUserInitials(user: User): string {
  const meta = user.user_metadata
  if (meta?.first_name && meta?.last_name) {
    return `${meta.first_name[0]}${meta.last_name[0]}`.toUpperCase()
  }
  if (meta?.full_name) {
    const parts = meta.full_name.split(' ')
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase()
  }
  if (user.email) return user.email[0].toUpperCase()
  return 'U'
}

function getUserDisplayName(user: User): string {
  const meta = user.user_metadata
  if (meta?.full_name) return meta.full_name
  if (meta?.first_name) {
    return meta.last_name ? `${meta.first_name} ${meta.last_name}` : meta.first_name
  }
  return user.email ?? 'User'
}

interface DashboardHeaderProps {
  user: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const isDashboard = pathname === '/'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          {isDashboard && (
            <p className="text-sm text-muted-foreground">
              Welcome back. Here&apos;s what&apos;s happening across your schemes.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-tight">{getUserDisplayName(user)}</p>
          <p className="text-xs text-muted-foreground">Manager</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
