'use client'

import type { ValidationResult } from '@/types'

interface ValidationResultViewProps {
  result: ValidationResult
  onReset: () => void
}

const ERROR_LABELS: Record<string, { title: string; description: string }> = {
  invalid_code: {
    title: 'Code Not Found',
    description: 'This discount code does not exist or is invalid.',
  },
  already_used: {
    title: 'Code Already Redeemed',
    description: 'This discount code has already been used.',
  },
  expired: {
    title: 'Code Expired',
    description: 'This discount code has expired. The employee needs to generate a new one.',
  },
  inactive_employee: {
    title: 'Employee Account Inactive',
    description: 'This employee account has been deactivated.',
  },
  over_limit: {
    title: 'Monthly Limit Exceeded',
    description: 'This transaction would exceed the employee monthly spending limit.',
  },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ValidationResultView({ result, onReset }: ValidationResultViewProps) {
  if (result.success) {
    return <SuccessView result={result} onReset={onReset} />
  }
  return <FailureView result={result} onReset={onReset} />
}

function SuccessView({
  result,
  onReset,
}: {
  result: ValidationResult
  onReset: () => void
}) {
  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Success Header */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
        {/* Animated Checkmark */}
        <div className="animate-scale-in mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600"
          >
            <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
          </svg>
        </div>

        <h2 className="mb-1 text-xl font-medium text-emerald-600">
          Discount Applied
        </h2>
        <p className="text-sm text-slate-500">
          Transaction #{result.transaction_id?.slice(0, 8)}
        </p>
      </div>

      {/* Employee Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Employee</p>
            <p className="text-base font-medium text-slate-800">
              {result.employee_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Division</p>
            <p className="text-base text-slate-800">
              {result.division_name}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center rounded-lg bg-teal-50 py-2">
          <span className="text-lg font-medium text-teal-600">
            {result.discount_percentage}% Discount
          </span>
        </div>
      </div>

      {/* Amounts - Large, clear for cashiers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          {/* Original */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Original Amount</span>
            <span className="text-lg tabular-nums text-slate-500 line-through">
              {formatCurrency(result.original_amount ?? 0)}
            </span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-600/80">Discount Saved</span>
            <span className="text-lg tabular-nums text-emerald-600">
              -{formatCurrency(result.discount_amount ?? 0)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200" />

          {/* Final Amount - Extra large */}
          <div className="flex items-center justify-between py-1">
            <span className="text-base font-medium text-slate-700">
              Amount to Charge
            </span>
            <span className="text-3xl font-medium tabular-nums text-slate-900 sm:text-4xl">
              {formatCurrency(result.final_amount ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Remaining limit */}
      {result.remaining_limit !== undefined && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
          <span className="text-xs text-slate-400">
            Employee remaining monthly limit:{' '}
          </span>
          <span className="text-sm font-medium tabular-nums text-slate-700">
            {formatCurrency(result.remaining_limit)}
          </span>
        </div>
      )}

      {/* New Validation button */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-teal-600 px-6 py-4 text-base font-medium text-white transition-all active:scale-[0.98] hover:bg-teal-700"
      >
        New Validation
      </button>
    </div>
  )
}

function FailureView({
  result,
  onReset,
}: {
  result: ValidationResult
  onReset: () => void
}) {
  const errorInfo = result.error
    ? ERROR_LABELS[result.error] || {
        title: 'Validation Failed',
        description: result.message || 'An unexpected error occurred.',
      }
    : { title: 'Validation Failed', description: 'An unexpected error occurred.' }

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Failure Header */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
        {/* Animated X */}
        <div className="animate-scale-in mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-600"
          >
            <line x1="18" y1="6" x2="6" y2="18" className="animate-draw-x" />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              className="animate-draw-x"
              style={{ animationDelay: '0.15s' }}
            />
          </svg>
        </div>

        <h2 className="mb-1 text-xl font-medium text-red-600">
          {errorInfo.title}
        </h2>
        <p className="text-sm text-slate-500">{errorInfo.description}</p>
      </div>

      {/* Over limit details */}
      {result.error === 'over_limit' && result.details && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            Limit Details
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Monthly Limit</span>
              <span className="text-sm tabular-nums text-slate-700">
                {formatCurrency(result.details.limit ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Already Spent</span>
              <span className="text-sm tabular-nums text-slate-700">
                {formatCurrency(result.details.spent ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Remaining</span>
              <span className="text-sm tabular-nums text-teal-600">
                {formatCurrency(result.details.remaining ?? 0)}
              </span>
            </div>
            <div className="border-t border-slate-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Requested Amount
              </span>
              <span className="text-sm tabular-nums text-red-600">
                {formatCurrency(result.details.requested ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Try Again button */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-teal-600 px-6 py-4 text-base font-medium text-white transition-all active:scale-[0.98] hover:bg-teal-700"
      >
        Try Again
      </button>
    </div>
  )
}
