'use client'

import { useMemo } from 'react'
import type { MonthlyTrend } from '@/types'

interface MonthlyTrendsProps {
  trends: MonthlyTrend[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatMonth = (monthStr: string) => {
  // monthStr expected as "YYYY-MM" or similar
  const date = new Date(monthStr + '-01')
  return new Intl.DateTimeFormat('en-CY', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function MonthlyTrends({ trends }: MonthlyTrendsProps) {
  const maxTransactions = useMemo(() => {
    if (trends.length === 0) return 1
    return Math.max(...trends.map((t) => t.transactions), 1)
  }, [trends])

  const maxAmount = useMemo(() => {
    if (trends.length === 0) return 1
    return Math.max(...trends.map((t) => t.total_original), 1)
  }, [trends])

  // Compute month-over-month changes
  const trendsWithChange = useMemo(() => {
    return trends.map((t, i) => {
      if (i === 0) {
        return { ...t, txnChange: null as number | null, amtChange: null as number | null }
      }
      const prev = trends[i - 1]
      const txnChange =
        prev.transactions > 0
          ? ((t.transactions - prev.transactions) / prev.transactions) * 100
          : t.transactions > 0
            ? 100
            : 0
      const amtChange =
        prev.total_original > 0
          ? ((t.total_original - prev.total_original) / prev.total_original) * 100
          : t.total_original > 0
            ? 100
            : 0
      return { ...t, txnChange, amtChange }
    })
  }, [trends])

  if (trends.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-500">
          Monthly Trends
        </h3>
        <div className="flex h-32 items-center justify-center text-sm text-neutral-600">
          No monthly data available yet.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="mb-6 text-sm font-medium uppercase tracking-wider text-neutral-500">
        Monthly Trends
      </h3>

      <div className="space-y-4">
        {trendsWithChange.map((t) => (
          <div key={t.month} className="space-y-2">
            {/* Month header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-300">
                {formatMonth(t.month)}
              </span>
              <div className="flex items-center gap-4">
                {/* Transaction change indicator */}
                {t.txnChange !== null && (
                  <ChangeIndicator value={t.txnChange} label="txns" />
                )}
                <span className="text-xs tabular-nums text-neutral-500">
                  {t.unique_employees} employee{t.unique_employees !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Transaction bar */}
            <div className="flex items-center gap-3">
              <span className="w-14 text-right text-[11px] tabular-nums text-neutral-500">
                {t.transactions} txn{t.transactions !== 1 ? 's' : ''}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-[#D4A853]/70 transition-all duration-500"
                  style={{
                    width: `${(t.transactions / maxTransactions) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Amount bar */}
            <div className="flex items-center gap-3">
              <span className="w-14 text-right text-[11px] tabular-nums text-neutral-500">
                {formatCurrency(t.total_original)}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-[#D4A853]/40 transition-all duration-500"
                  style={{
                    width: `${(t.total_original / maxAmount) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Savings row */}
            <div className="flex items-center gap-3">
              <span className="w-14 text-right text-[11px] tabular-nums text-emerald-500/70">
                {formatCurrency(t.total_discount)}
              </span>
              <span className="text-[10px] text-neutral-600">saved</span>
              {t.amtChange !== null && (
                <ChangeIndicator value={t.amtChange} label="vol" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangeIndicator({ value, label }: { value: number; label: string }) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className="text-[10px] tabular-nums text-neutral-600">
        -- {label}
      </span>
    )
  }

  const isPositive = value > 0

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums ${
        isPositive ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {/* Arrow */}
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        className={isPositive ? '' : 'rotate-180'}
      >
        <path d="M4 1L7 5H1L4 1Z" fill="currentColor" />
      </svg>
      {Math.abs(value).toFixed(0)}% {label}
    </span>
  )
}
