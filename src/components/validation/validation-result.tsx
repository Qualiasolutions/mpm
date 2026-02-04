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
      <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-6 text-center sm:p-8">
        {/* Animated Checkmark */}
        <div className="animate-scale-in mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/[0.15]">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-400"
          >
            <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
          </svg>
        </div>

        <h2 className="mb-1 text-xl font-medium text-green-400">
          Discount Applied
        </h2>
        <p className="text-sm text-neutral-400">
          Transaction #{result.transaction_id?.slice(0, 8)}
        </p>
      </div>

      {/* Employee Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Employee</p>
            <p className="text-base font-medium text-neutral-200">
              {result.employee_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Division</p>
            <p className="text-base text-neutral-200">
              {result.division_name}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center rounded-lg bg-[#D4A853]/[0.08] py-2">
          <span className="text-lg font-medium text-[#D4A853]">
            {result.discount_percentage}% Discount
          </span>
        </div>
      </div>

      {/* Amounts - Large, clear for cashiers */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="space-y-3">
          {/* Original */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Original Amount</span>
            <span className="text-lg tabular-nums text-neutral-400 line-through">
              {formatCurrency(result.original_amount ?? 0)}
            </span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-400/80">Discount Saved</span>
            <span className="text-lg tabular-nums text-green-400">
              -{formatCurrency(result.discount_amount ?? 0)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Final Amount - Extra large */}
          <div className="flex items-center justify-between py-1">
            <span className="text-base font-medium text-neutral-300">
              Amount to Charge
            </span>
            <span className="text-3xl font-medium tabular-nums text-neutral-100 sm:text-4xl">
              {formatCurrency(result.final_amount ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Remaining limit */}
      {result.remaining_limit !== undefined && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
          <span className="text-xs text-neutral-500">
            Employee remaining monthly limit:{' '}
          </span>
          <span className="text-sm font-medium tabular-nums text-neutral-300">
            {formatCurrency(result.remaining_limit)}
          </span>
        </div>
      )}

      {/* New Validation button */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-[#D4A853] px-6 py-4 text-base font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90"
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
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center sm:p-8">
        {/* Animated X */}
        <div className="animate-scale-in mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/[0.15]">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
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

        <h2 className="mb-1 text-xl font-medium text-red-400">
          {errorInfo.title}
        </h2>
        <p className="text-sm text-neutral-400">{errorInfo.description}</p>
      </div>

      {/* Over limit details */}
      {result.error === 'over_limit' && result.details && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Limit Details
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Monthly Limit</span>
              <span className="text-sm tabular-nums text-neutral-300">
                {formatCurrency(result.details.limit ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Already Spent</span>
              <span className="text-sm tabular-nums text-neutral-300">
                {formatCurrency(result.details.spent ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Remaining</span>
              <span className="text-sm tabular-nums text-[#D4A853]">
                {formatCurrency(result.details.remaining ?? 0)}
              </span>
            </div>
            <div className="border-t border-white/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">
                Requested Amount
              </span>
              <span className="text-sm tabular-nums text-red-400">
                {formatCurrency(result.details.requested ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Try Again button */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-[#D4A853] px-6 py-4 text-base font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90"
      >
        Try Again
      </button>
    </div>
  )
}
