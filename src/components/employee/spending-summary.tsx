'use client'

import { useEffect, useState } from 'react'
import type { SpendingSummary as SpendingSummaryType } from '@/types'

interface SpendingSummaryProps {
  summary: SpendingSummaryType
}

export function SpendingSummary({ summary }: SpendingSummaryProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(summary.percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [summary.percentage])

  const radius = 58
  const strokeWidth = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedPercentage / 100) * circumference

  const ringColor =
    summary.percentage >= 90
      ? '#ef4444'
      : summary.percentage >= 70
        ? '#eab308'
        : '#0d9488'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-5">
        {/* Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            className="rotate-[-90deg]"
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(summary.remaining)}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              remaining
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-800">Monthly Spending</h3>
          <p className="mt-1 text-xs text-slate-500">
            {formatCurrency(summary.spent)} of {formatCurrency(summary.limit)} used
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(animatedPercentage, 100)}%`,
                backgroundColor: ringColor,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>{summary.percentage.toFixed(0)}% used</span>
            <span>Resets monthly</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
