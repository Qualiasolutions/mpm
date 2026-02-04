import Link from 'next/link'
import { LogoutButton } from './logout-button'

interface NavBarProps {
  role: string
  userName: string | null
}

export function NavBar({ role, userName }: NavBarProps) {
  const isAdmin = role === 'admin'
  const displayName = userName || 'User'

  return (
    <nav className="border-b border-white/[0.06] bg-[#0A0A0B]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Branding */}
        <Link
          href={isAdmin ? '/admin' : '/'}
          className="flex items-center gap-3"
        >
          <span className="text-lg font-light tracking-[0.25em] text-[#D4A853]">
            MPM
          </span>
          <span className="hidden text-[10px] tracking-[0.12em] text-neutral-600 sm:inline">
            EMPLOYEE PORTAL
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {isAdmin ? (
            <>
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/employees">Employees</NavLink>
              <NavLink href="/admin/divisions">Divisions</NavLink>
              <NavLink href="/admin/discounts">Discounts</NavLink>
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
        </div>

        {/* User Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <details className="relative md:hidden">
            <summary className="list-none rounded-md px-2.5 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-white/[0.06] bg-[#111113] py-1.5 shadow-xl">
              {isAdmin ? (
                <>
                  <MobileNavLink href="/admin">Dashboard</MobileNavLink>
                  <MobileNavLink href="/admin/employees">
                    Employees
                  </MobileNavLink>
                  <MobileNavLink href="/admin/divisions">
                    Divisions
                  </MobileNavLink>
                  <MobileNavLink href="/admin/discounts">
                    Discounts
                  </MobileNavLink>
                  <div className="my-1.5 border-t border-white/[0.06]" />
                  <MobileNavLink href="/dashboard">Employee View</MobileNavLink>
                </>
              ) : (
                <>
                  <MobileNavLink href="/dashboard">Dashboard</MobileNavLink>
                  <MobileNavLink href="/dashboard">Discounts</MobileNavLink>
                  <MobileNavLink href="/dashboard">History</MobileNavLink>
                </>
              )}
            </div>
          </details>

          {/* User Info */}
          <div className="flex items-center gap-2 border-l border-white/[0.06] pl-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm text-neutral-300">{displayName}</span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-600">
                {role}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  children,
  subtle,
}: {
  href: string
  children: React.ReactNode
  subtle?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-white/5 ${
        subtle
          ? 'text-neutral-600 hover:text-neutral-400'
          : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {children}
    </Link>
  )
}

function NavDivider() {
  return <div className="mx-1 h-4 w-px bg-white/[0.06]" />
}

function MobileNavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
    >
      {children}
    </Link>
  )
}
