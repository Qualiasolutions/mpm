import type { AdminStats } from '@/types'

interface AdminStatsProps {
  stats: AdminStats
}

const COLORS = ['bg-brand-50 text-brand-600', 'bg-emerald-50 text-emerald-600', 'bg-indigo-50 text-indigo-600', 'bg-amber-50 text-amber-600']

export function AdminStatsCards({ stats }: AdminStatsProps) {
  const cards = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Active Employees',
      value: stats.activeEmployees,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      label: 'Divisions',
      value: stats.totalDivisions,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      label: 'Active Discounts',
      value: stats.activeDiscountRules,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="2" /><circle cx="15" cy="15" r="2" /><line x1="7.5" y1="16.5" x2="16.5" y2="7.5" /><rect x="2" y="2" width="20" height="20" rx="2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                {card.label}
              </p>
            </div>
            <div className={`rounded-xl p-2.5 ${COLORS[i % COLORS.length]}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
