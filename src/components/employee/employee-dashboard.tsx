'use client'

import { useState } from 'react'
import { SpendingSummary } from './spending-summary'
import { DiscountList } from './discount-list'
import { CodeGenerator } from './code-generator'
import { TransactionHistory } from './transaction-history'
import type {
  EmployeeDiscount,
  SpendingSummary as SpendingSummaryType,
  Transaction,
  DiscountCode,
} from '@/types'

type View = 'dashboard' | 'generate' | 'history'

interface EmployeeDashboardProps {
  discounts: EmployeeDiscount[]
  spending: SpendingSummaryType
  activeCode: DiscountCode | null
  recentTransactions: Transaction[]
  totalTransactions: number
}

export function EmployeeDashboard({
  discounts,
  spending,
  activeCode,
  recentTransactions,
  totalTransactions,
}: EmployeeDashboardProps) {
  const [view, setView] = useState<View>('dashboard')
  const [selectedDivision, setSelectedDivision] = useState<{
    id: string
    name: string
    percentage: number
  } | null>(null)

  const atSpendingLimit = spending.remaining <= 0

  const handleSelectDiscount = (divisionId: string) => {
    const discount = discounts.find((d) => d.division.id === divisionId)
    if (discount) {
      setSelectedDivision({
        id: divisionId,
        name: discount.division.name,
        percentage: discount.discount_percentage,
      })
      setView('generate')
    }
  }

  const handleBack = () => {
    setSelectedDivision(null)
    setView('dashboard')
  }

  const handleActiveCodeClick = () => {
    if (activeCode) {
      const discount = discounts.find(
        (d) => d.division.id === activeCode.division_id
      )
      if (discount) {
        setSelectedDivision({
          id: activeCode.division_id,
          name: discount.division.name,
          percentage: discount.discount_percentage,
        })
        setView('generate')
      }
    }
  }

  return (
    <div className="pb-20">
      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          <SpendingSummary summary={spending} />

          {/* Active Code Banner */}
          {activeCode && activeCode.status === 'active' && (
            <button
              onClick={handleActiveCodeClick}
              className="w-full rounded-2xl border border-teal-200 bg-teal-50 p-4 text-left transition-all active:scale-[0.98] hover:bg-teal-100/70"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M7 17h.01" /><path d="M17 17h.01" /><rect x="7" y="7" width="3" height="3" /><rect x="14" y="7" width="3" height="3" /><rect x="7" y="14" width="3" height="3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-teal-700">
                    Active code: {activeCode.manual_code}
                  </p>
                  <p className="text-xs text-teal-600/70">
                    Tap to view QR code and details
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-teal-400">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          )}

          <DiscountList
            discounts={discounts}
            onSelectDiscount={handleSelectDiscount}
            atSpendingLimit={atSpendingLimit}
          />

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                <button
                  onClick={() => setView('history')}
                  className="text-xs font-medium text-teal-600 transition-colors hover:text-teal-700"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {recentTransactions.slice(0, 3).map((tx) => (
                  <RecentTransactionItem key={tx.id} transaction={tx} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate View */}
      {view === 'generate' && selectedDivision && (
        <CodeGenerator
          divisionId={selectedDivision.id}
          divisionName={selectedDivision.name}
          discountPercentage={selectedDivision.percentage}
          onBack={handleBack}
        />
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors active:scale-95 hover:bg-slate-50 hover:text-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-base font-semibold text-slate-800">
              Transaction History
            </h2>
          </div>
          <TransactionHistory
            initialTransactions={recentTransactions}
            total={totalTransactions}
            initialPage={1}
          />
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          <TabButton
            active={view === 'dashboard'}
            onClick={() => {
              setView('dashboard')
              setSelectedDivision(null)
            }}
            label="Home"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
          />
          <TabButton
            active={view === 'generate'}
            onClick={() => {
              if (discounts.length > 0 && !selectedDivision) {
                handleSelectDiscount(discounts[0].division.id)
              } else if (selectedDivision) {
                setView('generate')
              }
            }}
            label="Discounts"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="2" /><circle cx="15" cy="15" r="2" /><line x1="7.5" y1="16.5" x2="16.5" y2="7.5" /><rect x="2" y="2" width="20" height="20" rx="2" />
              </svg>
            }
          />
          <TabButton
            active={view === 'history'}
            onClick={() => setView('history')}
            label="History"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
        active
          ? 'text-teal-600'
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  )
}

function RecentTransactionItem({ transaction }: { transaction: Transaction }) {
  const date = new Date(transaction.created_at)
  const formattedDate = formatRelativeDate(date)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-700">
          {transaction.division_name || 'Division'}
        </span>
        <span className="text-xs text-slate-400">{formattedDate}</span>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="block text-sm font-semibold text-slate-800">
          {formatCurrency(transaction.final_amount)}
        </span>
        <span className="text-[10px] font-medium text-emerald-600">
          -{formatCurrency(transaction.discount_amount)}
        </span>
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
