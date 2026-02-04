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
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Inputs */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          From
        </label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20 [color-scheme:dark]"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          To
        </label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20 [color-scheme:dark]"
        />
      </div>

      <button
        type="button"
        onClick={handleApply}
        className="rounded-md bg-[#D4A853] px-3 py-1.5 text-xs font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90"
      >
        Apply
      </button>

      {(dateFrom || dateTo) && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          Clear
        </button>
      )}

      {/* Divider */}
      <div className="mx-1 hidden h-4 w-px bg-white/[0.06] sm:block" />

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
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-200"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
