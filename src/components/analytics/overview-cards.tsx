'use client'

import type { AnalyticsOverview } from '@/types'

interface OverviewCardsProps {
  overview: AnalyticsOverview
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-CY').format(value)

export function OverviewCards({ overview }: OverviewCardsProps) {
  const cards = [
    {
      label: 'Total Transactions',
      value: formatNumber(overview.totalTransactions),
      accent: false,
      icon: (
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
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Total Purchases',
      value: formatCurrency(overview.totalOriginalAmount),
      accent: false,
      icon: (
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
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Total Savings',
      value: formatCurrency(overview.totalDiscountAmount),
      accent: true,
      icon: (
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
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      ),
    },
    {
      label: 'Final Revenue',
      value: formatCurrency(overview.totalFinalAmount),
      accent: false,
      icon: (
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
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Active Employees',
      value: formatNumber(overview.activeEmployees),
      accent: true,
      icon: (
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      label: 'Avg Discount',
      value: `${overview.averageDiscountPercentage.toFixed(1)}%`,
      accent: false,
      icon: (
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
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl p-4 transition-colors ${
            card.accent
              ? 'border border-teal-200 bg-teal-50'
              : 'border border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p
                className={`truncate text-xl font-light tabular-nums sm:text-2xl ${
                  card.accent ? 'text-teal-600' : 'text-slate-900'
                }`}
              >
                {card.value}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {card.label}
              </p>
            </div>
            <div
              className={`flex-shrink-0 ${
                card.accent ? 'text-teal-600/40' : 'text-slate-400'
              }`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
