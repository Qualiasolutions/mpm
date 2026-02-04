import Link from 'next/link'
import { getAdminStats } from '@/actions/admin'
import { AdminStatsCards } from '@/components/admin/admin-stats'

export default async function AdminDashboardPage() {
  const statsResult = await getAdminStats()
  const stats =
    'stats' in statsResult
      ? statsResult.stats
      : {
          totalEmployees: 0,
          activeEmployees: 0,
          totalDivisions: 0,
          activeDiscountRules: 0,
        }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage employees, divisions, and discount rules
        </p>
      </div>

      <AdminStatsCards stats={stats} />

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Validate Code - Primary Action */}
        <Link
          href="/admin/validate"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white transition-all hover:shadow-xl hover:shadow-teal-600/20 active:scale-[0.98] sm:col-span-2 lg:col-span-1"
        >
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-8 h-16 w-16 translate-y-4 rounded-full bg-white/5" />
          <div className="relative">
            <div className="mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3 className="text-lg font-bold">Validate Code</h3>
            <p className="mt-1 text-sm text-teal-100">
              Scan QR or enter code to apply employee discount
            </p>
          </div>
        </Link>

        <AdminCard
          href="/admin/employees"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>}
          title="Employee Management"
          description="Create, edit, and manage employee accounts"
        />

        <AdminCard
          href="/admin/divisions"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
          title="Division Management"
          description="Manage divisions and their brands"
        />

        <AdminCard
          href="/admin/discounts"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2" /><circle cx="15" cy="15" r="2" /><line x1="7.5" y1="16.5" x2="16.5" y2="7.5" /><rect x="2" y="2" width="20" height="20" rx="2" /></svg>}
          title="Discount Rules"
          description="Configure discount percentages and limits"
        />

        <AdminCard
          href="/admin/analytics"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
          title="Analytics"
          description="Reports, trends, and export data"
        />
      </div>
    </div>
  )
}

function AdminCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 active:scale-[0.98]"
    >
      <div className="mb-3 text-teal-600 group-hover:text-teal-700 transition-colors">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </Link>
  )
}
