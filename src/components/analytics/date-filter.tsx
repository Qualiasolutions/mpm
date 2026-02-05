'use client'

import { useState, useCallback } from 'react'

interface DateFilterProps {
  onFilterChange: (dateFrom: string | undefined, dateTo: string | undefined) => void
}

function getPresetDates(preset: string): { from: string; to: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (preset) {
    case 'this-month': {
      const from = new Date(year, month, 1)
      return {
        from: formatDate(from),
        to: formatDate(now),
      }
    }
    case 'last-month': {
      const from = new Date(year, month - 1, 1)
      const to = new Date(year, month, 0)
      return {
        from: formatDate(from),
        to: formatDate(to),
      }
    }
    case 'last-3-months': {
      const from = new Date(year, month - 3, 1)
      return {
        from: formatDate(from),
        to: formatDate(now),
      }
    }
    case 'this-year': {
      const from = new Date(year, 0, 1)
      return {
        from: formatDate(from),
        to: formatDate(now),
      }
    }
    default:
      return { from: '', to: '' }
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function DateFilter({ onFilterChange }: DateFilterProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleApply = useCallback(() => {
    onFilterChange(dateFrom || undefined, dateTo || undefined)
  }, [dateFrom, dateTo, onFilterChange])

  const handlePreset = useCallback(
    (preset: string) => {
      const { from, to } = getPresetDates(preset)
      setDateFrom(from)
      setDateTo(to)
      onFilterChange(from || undefined, to || undefined)
    },
    [onFilterChange]
  )

  const handleClear = useCallback(() => {
    setDateFrom('')
    setDateTo('')
    onFilterChange(undefined, undefined)
  }, [onFilterChange])

  return (
    <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
      {/* Date Inputs */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 w-8 shrink-0">
          From
        </label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200 sm:flex-none sm:px-2.5"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 w-8 shrink-0">
          To
        </label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200 sm:flex-none sm:px-2.5"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-brand-700"
        >
          Apply
        </button>

        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1">
        {[
          { label: 'This Month', value: 'this-month' },
          { label: 'Last Month', value: 'last-month' },
          { label: 'Last 3 Months', value: 'last-3-months' },
          { label: 'This Year', value: 'this-year' },
        ].map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.value)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
