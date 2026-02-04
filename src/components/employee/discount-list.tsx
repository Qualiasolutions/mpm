'use client'

import type { EmployeeDiscount } from '@/types'

interface DiscountListProps {
  discounts: EmployeeDiscount[]
  onSelectDiscount: (divisionId: string) => void
  atSpendingLimit?: boolean
}

export function DiscountList({
  discounts,
  onSelectDiscount,
  atSpendingLimit = false,
}: DiscountListProps) {
  if (discounts.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-600"
          >
            <circle cx="9" cy="9" r="2" />
            <circle cx="15" cy="15" r="2" />
            <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" />
            <rect x="2" y="2" width="20" height="20" rx="2" />
          </svg>
        </div>
        <p className="text-sm text-neutral-500">No discounts available</p>
        <p className="mt-1 text-xs text-neutral-600">
          Contact your administrator for access
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-400">Your Discounts</h3>
      <div className="grid gap-3">
        {discounts.map((discount) => (
          <button
            key={discount.division.id}
            onClick={() => onSelectDiscount(discount.division.id)}
            disabled={atSpendingLimit}
            className={`group w-full rounded-lg border p-4 text-left transition-all ${
              atSpendingLimit
                ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-50'
                : 'border-white/[0.06] bg-white/[0.02] active:scale-[0.98] hover:border-[#D4A853]/20 hover:bg-[#D4A853]/[0.03]'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Discount Percentage */}
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg ${
                  atSpendingLimit
                    ? 'bg-white/[0.03]'
                    : 'bg-[#D4A853]/[0.08] group-hover:bg-[#D4A853]/[0.12]'
                } transition-colors`}
              >
                <span
                  className={`text-lg font-light ${
                    atSpendingLimit ? 'text-neutral-600' : 'text-[#D4A853]'
                  }`}
                >
                  {discount.discount_percentage}%
                </span>
              </div>

              {/* Division Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-200 transition-colors group-hover:text-neutral-100">
                    {discount.division.name}
                  </span>
                  <span className="flex-shrink-0 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                    {discount.division.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {discount.brand_count} brand{discount.brand_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Arrow */}
              {!atSpendingLimit && (
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
                  className="flex-shrink-0 text-neutral-700 transition-colors group-hover:text-neutral-400"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>

            {atSpendingLimit && (
              <div className="mt-2 rounded bg-red-500/[0.08] px-2 py-1 text-[10px] text-red-400">
                Monthly spending limit reached
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
