'use client'

import { useState, useMemo, useCallback } from 'react'
import type { DivisionReportRow } from '@/types'
import { exportDivisionReportCSV } from '@/actions/analytics'

interface DivisionReportProps {
  rows: DivisionReportRow[]
  dateFrom?: string
  dateTo?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

type SortField = keyof DivisionReportRow
type SortDir = 'asc' | 'desc'

// Stable color palette for division codes
const CODE_COLORS = [
  { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-600' },
  { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-600' },
  { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
  { border: 'border-brand-500/30', bg: 'bg-brand-500/10', text: 'text-brand-600' },
]

function getCodeColor(index: number) {
  return CODE_COLORS[index % CODE_COLORS.length]
}

export function DivisionReport({ rows, dateFrom, dateTo }: DivisionReportProps) {
  const [sortField, setSortField] = useState<SortField>('total_discount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [exporting, setExporting] = useState(false)

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
    },
    [sortField]
  )

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const aNum = Number(aVal) || 0
      const bNum = Number(bVal) || 0
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [rows, sortField, sortDir])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const result = await exportDivisionReportCSV(dateFrom, dateTo)
      if ('csv' in result) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `division-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch {
      // Silently handle - the action may not be available yet
    } finally {
      setExporting(false)
    }
  }, [dateFrom, dateTo])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">
          Division Report
        </h2>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          {exporting ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <SortableHeader
                label="Division"
                field="name"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Code"
                field="code"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Txns"
                field="transaction_count"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Purchases"
                field="total_original"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Savings"
                field="total_discount"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Final"
                field="total_final"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Employees"
                field="unique_employees"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Avg Discount"
                field="avg_discount_pct"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  No division data available.
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => {
                const color = getCodeColor(i)
                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-3 py-3.5 font-medium text-slate-800 sm:px-5">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 sm:px-5">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${color.border} ${color.bg} ${color.text}`}
                      >
                        {row.code}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700 sm:px-5">
                      {row.transaction_count}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700 sm:px-5">
                      {formatCurrency(row.total_original)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-brand-600 sm:px-5">
                      {formatCurrency(row.total_discount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700 sm:px-5">
                      {formatCurrency(row.total_final)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700 sm:px-5">
                      {row.unique_employees}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-500 sm:px-5">
                      {row.avg_discount_pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="border-t border-slate-200 px-3 py-3 sm:px-5">
          <p className="text-[11px] text-slate-400">
            {sorted.length} division{sorted.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className = '',
}: {
  label: string
  field: SortField
  currentField: SortField
  direction: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentField === field

  return (
    <th
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-700 sm:px-5 ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span
          className={`inline-flex flex-col leading-none ${
            isActive ? 'text-brand-600' : 'text-slate-300'
          }`}
        >
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            className={`${
              isActive && direction === 'asc'
                ? 'text-brand-600'
                : 'text-slate-300'
            }`}
          >
            <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
          </svg>
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            className={`${
              isActive && direction === 'desc'
                ? 'text-brand-600'
                : 'text-slate-300'
            }`}
          >
            <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
          </svg>
        </span>
      </span>
    </th>
  )
}
