'use client'

import { useState, useTransition } from 'react'
import { getMyTransactions } from '@/actions/employee'
import type { Transaction } from '@/types'

interface TransactionHistoryProps {
  initialTransactions: Transaction[]
  total: number
  initialPage: number
}

export function TransactionHistory({
  initialTransactions,
  total,
  initialPage,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [page, setPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()

  const hasMore = transactions.length < total

  const loadMore = () => {
    startTransition(async () => {
      const nextPage = page + 1
      const result = await getMyTransactions(nextPage, 10)
      if ('error' in result) return
      setTransactions((prev) => [...prev, ...result.transactions])
      setPage(nextPage)
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-600"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-neutral-400">No transactions yet</p>
        <p className="mt-1 text-xs text-neutral-600">
          Your discount usage will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-400">
          Transaction History
        </h3>
        <span className="text-xs text-neutral-600">{total} total</span>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-neutral-400 transition-colors active:scale-[0.98] hover:bg-white/[0.05] hover:text-neutral-200 disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-neutral-600 border-t-neutral-300" />
              Loading...
            </span>
          ) : (
            `Load more (${total - transactions.length} remaining)`
          )}
        </button>
      )}
    </div>
  )
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const date = new Date(transaction.created_at)
  const formattedDate = formatRelativeDate(date)

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-neutral-200">
              {transaction.division_name || 'Unknown Division'}
            </span>
            <span className="flex-shrink-0 rounded bg-[#D4A853]/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#D4A853]">
              -{transaction.discount_percentage}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-600">{formattedDate}</p>
          {transaction.location && (
            <p className="mt-0.5 text-xs text-neutral-600">
              {transaction.location}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-sm text-neutral-200">
            {formatCurrency(transaction.final_amount)}
          </p>
          <p className="mt-0.5 text-xs text-green-400/70">
            Saved {formatCurrency(transaction.discount_amount)}
          </p>
          <p className="text-[10px] text-neutral-600 line-through">
            {formatCurrency(transaction.original_amount)}
          </p>
        </div>
      </div>
    </div>
  )
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
