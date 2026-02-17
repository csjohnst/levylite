'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Wrench,
  Calendar,
  User,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { OwnerUserNav } from '@/components/owner/owner-user-nav'

const navItems = [
  { title: 'Dashboard', href: '/owner', icon: LayoutDashboard, exact: true },
  { title: 'Levies', href: '/owner/levies', icon: Receipt },
  { title: 'Documents', href: '/owner/documents', icon: FileText },
  { title: 'Maintenance', href: '/owner/maintenance', icon: Wrench },
  { title: 'Meetings', href: '/owner/meetings', icon: Calendar },
  { title: 'Profile', href: '/owner/profile', icon: User },
]

interface OwnerHeaderProps {
  ownerName: string
  ownerEmail: string
}

export function OwnerHeader({ ownerName, ownerEmail }: OwnerHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
        {/* Left: Logo + mobile hamburger */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <Link href="/owner" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#02667F] text-white font-bold text-sm">
              LL
            </div>
            <span className="font-semibold text-sm hidden sm:inline">LevyLite</span>
          </Link>
        </div>

        {/* Center: Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'text-[#02667F] bg-[#02667F]/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* Right: User menu */}
        <OwnerUserNav ownerName={ownerName} ownerEmail={ownerEmail} />
      </div>

      {/* Mobile nav drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#02667F] text-white font-bold text-sm">
                LL
              </div>
              LevyLite
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-4 px-2">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)

              return (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                      ${isActive
                        ? 'text-[#02667F] bg-[#02667F]/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <item.icon className="size-5" />
                    {item.title}
                  </Link>
                </SheetClose>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
