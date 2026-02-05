'use client'

import { useState, useMemo, useCallback } from 'react'

interface ActivityChartProps {
  data: { date: string; count: number; amount: number }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-CY', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))

const formatDateFull = (dateStr: string) =>
  new Intl.DateTimeFormat('en-CY', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr))

type ViewMode = 'count' | 'amount'

export function ActivityChart({ data }: ActivityChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('count')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxValue = useMemo(() => {
    if (data.length === 0) return 1
    const values = data.map((d) => (viewMode === 'count' ? d.count : d.amount))
    return Math.max(...values, 1)
  }, [data, viewMode])

  // Generate Y-axis labels
  const yLabels = useMemo(() => {
    const steps = 4
    const labels: string[] = []
    for (let i = steps; i >= 0; i--) {
      const value = (maxValue / steps) * i
      labels.push(
        viewMode === 'count'
          ? Math.round(value).toString()
          : formatCurrency(value)
      )
    }
    return labels
  }, [maxValue, viewMode])

  const handleBarEnter = useCallback((index: number) => {
    setHoveredIndex(index)
  }, [])

  const handleBarLeave = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider text-slate-400">
            Daily Activity
          </h3>
        </div>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No transaction data available for the selected period.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-slate-400">
          Daily Activity
        </h3>
        <div className="flex rounded-md border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setViewMode('count')}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'count'
                ? 'bg-teal-50 text-teal-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Count
          </button>
          <button
            type="button"
            onClick={() => setViewMode('amount')}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'amount'
                ? 'bg-teal-50 text-teal-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Amount
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-48 flex-col justify-between">
          {yLabels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] tabular-nums text-slate-400"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="ml-16 overflow-x-auto">
          <div
            className="relative flex h-48 items-end gap-[2px]"
            style={{
              minWidth: `${Math.max(data.length * 20, 200)}px`,
            }}
          >
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={`grid-${i}`}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: `${(i / 4) * 100}%` }}
              />
            ))}

            {/* Bars */}
            {data.map((d, i) => {
              const value = viewMode === 'count' ? d.count : d.amount
              const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0
              const isHovered = hoveredIndex === i

              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ height: '100%' }}
                  onMouseEnter={() => handleBarEnter(i)}
                  onMouseLeave={handleBarLeave}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
                      <p className="font-medium text-slate-800">
                        {formatDateFull(d.date)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {d.count} transaction{d.count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-slate-500">
                        {formatCurrency(d.amount)}
                      </p>
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full min-w-[6px] max-w-[32px] rounded-t transition-all duration-150 ${
                      isHovered
                        ? 'bg-[#0d9488]'
                        : 'bg-[#0d9488]/60 hover:bg-[#0d9488]/80'
                    }`}
                    style={{
                      height: `${Math.max(heightPct, value > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div
            className="mt-2 flex gap-[2px]"
            style={{
              minWidth: `${Math.max(data.length * 20, 200)}px`,
            }}
          >
            {data.map((d, i) => {
              // Show every Nth label based on data density
              const showLabel =
                data.length <= 15 ||
                i % Math.ceil(data.length / 10) === 0 ||
                i === data.length - 1
              return (
                <div key={d.date} className="flex-1 text-center">
                  {showLabel && (
                    <span className="text-[9px] tabular-nums text-slate-400">
                      {formatDate(d.date)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
