'use client'

import { useState, useEffect, useTransition } from 'react'
import { getRecentValidations } from '@/actions/validation'
import type { RecentValidation } from '@/types'

interface RecentValidationsProps {
  initialValidations: RecentValidation[]
  refreshKey: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function RecentValidations({
  initialValidations,
  refreshKey,
}: RecentValidationsProps) {
  const [validations, setValidations] = useState(initialValidations)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Refresh when refreshKey changes (new validation completed)
  useEffect(() => {
    if (refreshKey === 0) return

    startTransition(async () => {
      const result = await getRecentValidations(10)
      if ('validations' in result) {
        setValidations(result.validations)
      }
    })
  }, [refreshKey])

  if (validations.length === 0 && !isPending) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-500">
            Recent Validations
          </h3>
          {isPending && (
            <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-700" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-slate-400">
            {validations.length}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Validation List */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {validations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400">
                No recent validations
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
              {validations.map((v) => (
                <ValidationItem key={v.id} validation={v} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ValidationItem({ validation }: { validation: RecentValidation }) {
  const date = new Date(validation.created_at)
  const formattedDate = formatRelativeDate(date)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-slate-800">
            {validation.employee_name}
          </span>
          <span className="flex-shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
            -{validation.discount_percentage}%
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          <span>{validation.division_name}</span>
          <span>--</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-sm tabular-nums text-slate-800">
          {formatCurrency(validation.final_amount)}
        </p>
        <p className="text-[10px] tabular-nums text-emerald-600/70">
          Saved {formatCurrency(validation.discount_amount)}
        </p>
      </div>
    </div>
  )
}
