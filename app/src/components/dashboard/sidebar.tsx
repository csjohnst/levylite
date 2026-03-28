'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Receipt,
  DollarSign,
  Landmark,
  Calendar,
  Wrench,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { SchemeSwitcher } from '@/components/dashboard/scheme-switcher'
import { UserNav } from '@/components/dashboard/user-nav'
import { useCurrentScheme } from '@/hooks/use-current-scheme'

interface SchemeOption {
  id: string
  scheme_name: string
  scheme_number: string
  status: string
}

interface AppSidebarProps {
  user: User
  organisation: { id: string; name: string } | null | undefined
  schemes: SchemeOption[]
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: 'Schemes',
    href: '/schemes',
    icon: Building2,
    schemeHref: '/schemes/{id}',
  },
  {
    title: 'Owners',
    href: '/owners',
    icon: Users,
  },
  {
    title: 'Levies',
    href: '/levies',
    icon: Receipt,
    schemeHref: '/schemes/{id}/levies',
  },
  {
    title: 'Payments',
    href: '/payments',
    icon: DollarSign,
    schemeHref: '/schemes/{id}/payments',
  },
  {
    title: 'Trust Accounting',
    href: '/trust',
    icon: Landmark,
    schemeHref: '/schemes/{id}/trust',
  },
  {
    title: 'Meetings',
    href: '/meetings',
    icon: Calendar,
    schemeHref: '/schemes/{id}/meetings',
  },
  {
    title: 'Maintenance',
    href: '/maintenance',
    icon: Wrench,
    schemeHref: '/schemes/{id}/maintenance',
  },
  {
    title: 'Tradespeople',
    href: '/tradespeople',
    icon: HardHat,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    schemeHref: '/schemes/{id}/documents',
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function AppSidebar({ user, organisation, schemes }: AppSidebarProps) {
  const pathname = usePathname()
  const { schemeId } = useCurrentScheme()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                  L
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LevyLite</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {organisation?.name ?? 'Strata Management'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarHeader>
        <SchemeSwitcher schemes={schemes} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const resolvedHref =
                  schemeId && item.schemeHref
                    ? item.schemeHref.replace('{id}', schemeId)
                    : item.href

                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href) ||
                    (schemeId && item.schemeHref
                      ? pathname.startsWith(
                          item.schemeHref.replace('{id}', schemeId)
                        )
                      : false)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={resolvedHref}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserNav user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
