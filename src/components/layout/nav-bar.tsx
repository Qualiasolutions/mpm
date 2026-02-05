import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from './logout-button'

interface NavBarProps {
  role: string
  userName: string | null
}

export function NavBar({ role, userName }: NavBarProps) {
  const isAdmin = role === 'admin'
  const displayName = userName || 'User'

  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={isAdmin ? '/admin' : '/'}
          className="flex items-center"
        >
          <Image
            src="/logo.png"
            alt="MPM Imports"
            width={160}
            height={40}
            className="h-7 w-auto sm:h-8"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {isAdmin ? (
            <>
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/employees">Employees</NavLink>
              <NavLink href="/admin/divisions">Divisions</NavLink>
              <NavLink href="/admin/discounts">Discounts</NavLink>
              <NavLink href="/admin/validate" highlight>
                Validate
              </NavLink>
              <NavLink href="/admin/analytics">Analytics</NavLink>
              <NavDivider />
              <NavLink href="/dashboard" subtle>
                Employee View
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/dashboard">Discounts</NavLink>
              <NavLink href="/dashboard">History</NavLink>
            </>
          )}
          <NavDivider />
          <div className="flex items-center gap-3 pl-1">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">{displayName}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {role}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Mobile Menu - right side */}
        <details className="relative md:hidden">
          <summary className="list-none rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
            {/* User info */}
            <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
              <p className="text-sm font-medium text-slate-800">{displayName}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{role}</p>
            </div>

            {isAdmin ? (
              <>
                <MobileNavLink href="/admin">Dashboard</MobileNavLink>
                <MobileNavLink href="/admin/employees">Employees</MobileNavLink>
                <MobileNavLink href="/admin/divisions">Divisions</MobileNavLink>
                <MobileNavLink href="/admin/discounts">Discounts</MobileNavLink>
                <MobileNavLink href="/admin/validate" highlight>Validate</MobileNavLink>
                <MobileNavLink href="/admin/analytics">Analytics</MobileNavLink>
                <div className="my-1.5 border-t border-slate-100" />
                <MobileNavLink href="/dashboard">Employee View</MobileNavLink>
              </>
            ) : (
              <>
                <MobileNavLink href="/dashboard">Dashboard</MobileNavLink>
                <MobileNavLink href="/dashboard">Discounts</MobileNavLink>
                <MobileNavLink href="/dashboard">History</MobileNavLink>
              </>
            )}

            {/* Sign Out */}
            <div className="my-1.5 border-t border-slate-100" />
            <div className="px-1.5">
              <LogoutButton variant="menu" />
            </div>
          </div>
        </details>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  children,
  subtle,
  highlight,
}: {
  href: string
  children: React.ReactNode
  subtle?: boolean
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        highlight
          ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
          : subtle
            ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      {children}
    </Link>
  )
}

function NavDivider() {
  return <div className="mx-1 h-4 w-px bg-slate-200" />
}

function MobileNavLink({
  href,
  children,
  highlight,
}: {
  href: string
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${
        highlight
          ? 'text-brand-600 font-medium hover:text-brand-700'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  )
}
