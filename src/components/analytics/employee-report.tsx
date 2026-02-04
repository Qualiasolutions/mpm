'use client'

import { useState, useMemo, useCallback } from 'react'
import type { EmployeeReportRow } from '@/types'
import { exportEmployeeReportCSV } from '@/actions/analytics'

interface EmployeeReportProps {
  rows: EmployeeReportRow[]
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

type SortField = keyof EmployeeReportRow
type SortDir = 'asc' | 'desc'

export function EmployeeReport({ rows, dateFrom, dateTo }: EmployeeReportProps) {
  const [search, setSearch] = useState('')
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

  const filteredAndSorted = useMemo(() => {
    let result = rows

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (Array.isArray(aVal) && Array.isArray(bVal)) {
        const aStr = aVal.join(', ')
        const bStr = bVal.join(', ')
        return sortDir === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      }

      const aNum = Number(aVal) || 0
      const bNum = Number(bVal) || 0
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })

    return result
  }, [rows, search, sortField, sortDir])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const result = await exportEmployeeReportCSV(dateFrom, dateTo)
      if ('csv' in result) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `employee-report-${new Date().toISOString().split('T')[0]}.csv`
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
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">
          Employee Report
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
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
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </div>
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <SortableHeader
                label="Employee"
                field="name"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Divisions"
                field="division_names"
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
                label="Limit"
                field="monthly_limit"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Usage"
                field="limit_usage_pct"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
                className="text-right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  {search
                    ? 'No employees match your search.'
                    : 'No employee data available.'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-5 py-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {row.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {row.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.division_names.length > 0 ? (
                        row.division_names.map((name) => (
                          <span
                            key={name}
                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-700">
                    {row.transaction_count}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-700">
                    {formatCurrency(row.total_original)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-teal-600">
                    {formatCurrency(row.total_discount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-700">
                    {formatCurrency(row.total_final)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-500">
                    {formatCurrency(row.monthly_limit)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <UsageBar percentage={row.limit_usage_pct} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filteredAndSorted.length > 0 && (
        <div className="border-t border-slate-200 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            {filteredAndSorted.length} employee
            {filteredAndSorted.length !== 1 ? 's' : ''}
            {search ? ' (filtered)' : ''}
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
      className={`cursor-pointer select-none whitespace-nowrap px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-700 ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span
          className={`inline-flex flex-col leading-none ${
            isActive ? 'text-teal-600' : 'text-slate-300'
          }`}
        >
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            className={`${
              isActive && direction === 'asc'
                ? 'text-teal-600'
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
                ? 'text-teal-600'
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

function UsageBar({ percentage }: { percentage: number }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100)
  const colorClass =
    clampedPct >= 90
      ? 'bg-red-500'
      : clampedPct >= 70
        ? 'bg-yellow-500'
        : 'bg-emerald-500'

  const textColorClass =
    clampedPct >= 90
      ? 'text-red-600'
      : clampedPct >= 70
        ? 'text-yellow-400'
        : 'text-emerald-600'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <span className={`text-[11px] tabular-nums ${textColorClass}`}>
        {clampedPct.toFixed(0)}%
      </span>
    </div>
  )
}
