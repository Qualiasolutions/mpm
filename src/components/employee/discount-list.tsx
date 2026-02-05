'use client'

import type { EmployeeDiscount } from '@/types'

const DIVISION_COLORS: Record<string, string> = {
  CPD: 'bg-rose-50 text-rose-600 border-rose-200',
  PPD: 'bg-violet-50 text-violet-600 border-violet-200',
  ACD: 'bg-sky-50 text-sky-600 border-sky-200',
  FASHION: 'bg-amber-50 text-amber-600 border-amber-200',
}

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
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <circle cx="9" cy="9" r="2" /><circle cx="15" cy="15" r="2" /><line x1="7.5" y1="16.5" x2="16.5" y2="7.5" /><rect x="2" y="2" width="20" height="20" rx="2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">No discounts available</p>
        <p className="mt-1 text-xs text-slate-400">
          Contact your administrator for access
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">Your Discounts</h3>
      <div className="grid gap-3">
        {discounts.map((discount) => {
          const color = DIVISION_COLORS[discount.division.code] || 'bg-slate-50 text-slate-600 border-slate-200'
          return (
            <button
              key={discount.division.id}
              onClick={() => onSelectDiscount(discount.division.id)}
              disabled={atSpendingLimit}
              className={`group w-full rounded-2xl border p-4 text-left transition-all ${
                atSpendingLimit
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                  : 'border-slate-200 bg-white active:scale-[0.98] hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border ${
                    atSpendingLimit ? 'bg-slate-50 border-slate-200' : color
                  } transition-colors`}
                >
                  <span className="text-lg font-bold">
                    {discount.discount_percentage}%
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {discount.division.name}
                    </span>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {discount.division.code}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {discount.brand_count} brand{discount.brand_count !== 1 ? 's' : ''}
                  </p>
                </div>

                {!atSpendingLimit && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-500">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>

              {atSpendingLimit && (
                <div className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600">
                  Monthly spending limit reached
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
