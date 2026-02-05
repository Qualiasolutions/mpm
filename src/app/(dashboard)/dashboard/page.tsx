import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getMyDiscounts,
  getMySpendingSummary,
  getActiveCode,
  getMyTransactions,
} from '@/actions/employee'
import { EmployeeDashboard } from '@/components/employee/employee-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name ?? 'Employee'
  const role = profile?.role ?? 'employee'
  const isAdmin = role === 'admin'

  // Fetch employee data in parallel
  const [discountsResult, spendingResult, activeCodeResult, transactionsResult] =
    await Promise.all([
      getMyDiscounts(),
      getMySpendingSummary(),
      getActiveCode(),
      getMyTransactions(1, 5),
    ])

  const discounts =
    'error' in discountsResult ? [] : discountsResult.discounts
  const spending =
    'error' in spendingResult
      ? { limit: 5000, spent: 0, remaining: 5000, percentage: 0 }
      : spendingResult.summary
  const activeCode =
    'error' in activeCodeResult ? null : activeCodeResult.code
  const transactions =
    'error' in transactionsResult
      ? { transactions: [], total: 0, page: 1, pages: 0 }
      : transactionsResult

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-light tracking-wide text-slate-800 sm:text-2xl">
          Welcome, {firstName}
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            isAdmin
              ? 'bg-teal-50 text-teal-600'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {role}
        </span>
      </div>

      {/* Admin Quick Access */}
      {isAdmin && (
        <Link
          href="/admin"
          className="group flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-3.5 transition-colors hover:border-teal-200 hover:bg-teal-100"
        >
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
            className="text-teal-500"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-teal-600 transition-colors group-hover:text-teal-700">
              Admin Dashboard
            </div>
            <div className="text-xs text-slate-400">
              Manage employees, divisions, and discount rules
            </div>
          </div>
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
            className="ml-auto text-slate-300 transition-colors group-hover:text-slate-500"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Employee Dashboard */}
      <EmployeeDashboard
        discounts={discounts}
        spending={spending}
        activeCode={activeCode}
        recentTransactions={transactions.transactions}
        totalTransactions={transactions.total}
      />
    </div>
  )
}
