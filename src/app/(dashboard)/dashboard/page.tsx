import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name ?? 'Employee'
  const role = profile?.role ?? 'employee'
  const isAdmin = role === 'admin'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-light tracking-wide text-neutral-200">
          Welcome, {firstName}
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            isAdmin
              ? 'bg-[#D4A853]/10 text-[#D4A853]'
              : 'bg-white/[0.06] text-neutral-500'
          }`}
        >
          {role}
        </span>
      </div>

      {/* Admin Quick Access */}
      {isAdmin && (
        <Link
          href="/admin"
          className="group flex items-center gap-3 rounded-lg border border-[#D4A853]/10 bg-[#D4A853]/[0.03] px-5 py-3.5 transition-colors hover:border-[#D4A853]/20 hover:bg-[#D4A853]/[0.06]"
        >
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
            className="text-[#D4A853]/60"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-[#D4A853]/80 transition-colors group-hover:text-[#D4A853]">
              Admin Dashboard
            </div>
            <div className="text-xs text-neutral-600">
              Manage employees, divisions, and discount rules
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-auto text-neutral-700 transition-colors group-hover:text-neutral-500"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Placeholder Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Your Discounts"
          description="Your available discounts will appear here"
          icon={
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
              <circle cx="9" cy="9" r="2" />
              <circle cx="15" cy="15" r="2" />
              <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" />
              <rect x="2" y="2" width="20" height="20" rx="2" />
            </svg>
          }
        />
        <DashboardCard
          title="Recent Activity"
          description="Your discount usage history will appear here"
          icon={
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <DashboardCard
          title="Your Profile"
          description="Profile management coming soon"
          icon={
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]">
      <div className="mb-3 text-neutral-600">{icon}</div>
      <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
      <p className="mt-1 text-xs text-neutral-600">{description}</p>
    </div>
  )
}
