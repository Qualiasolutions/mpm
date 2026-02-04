'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AnalyticsOverview,
  EmployeeReportRow,
  DivisionReportRow,
  MonthlyTrend,
} from '@/types'

// =============================================================================
// Shared Helpers
// =============================================================================

async function requireAdmin(): Promise<
  { userId: string } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Not authorized' }
  }

  return { userId: user.id }
}

// =============================================================================
// Analytics Overview
// =============================================================================

export async function getAnalyticsOverview(
  dateFrom?: string,
  dateTo?: string
): Promise<AnalyticsOverview | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()

  // Build date filter
  let query = supabase.from('transactions').select('*')
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z')

  const { data: transactions, error } = await query

  if (error) {
    return { error: 'Failed to fetch transactions' }
  }

  const txns = transactions || []

  const totalTransactions = txns.length
  const totalOriginalAmount = txns.reduce((s, t) => s + (t.original_amount || 0), 0)
  const totalDiscountAmount = txns.reduce((s, t) => s + (t.discount_amount || 0), 0)
  const totalFinalAmount = txns.reduce((s, t) => s + (t.final_amount || 0), 0)
  const uniqueEmployees = new Set(txns.map((t) => t.employee_id))
  const activeEmployees = uniqueEmployees.size
  const averageDiscountPercentage =
    txns.length > 0
      ? txns.reduce((s, t) => s + (t.discount_percentage || 0), 0) / txns.length
      : 0

  // Group by day
  const byDay = new Map<string, { count: number; amount: number }>()
  for (const t of txns) {
    const date = t.created_at?.split('T')[0] || ''
    if (!date) continue
    const existing = byDay.get(date) || { count: 0, amount: 0 }
    existing.count++
    existing.amount += t.original_amount || 0
    byDay.set(date, existing)
  }

  const transactionsByDay = Array.from(byDay.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalTransactions,
    totalOriginalAmount,
    totalDiscountAmount,
    totalFinalAmount,
    activeEmployees,
    averageDiscountPercentage,
    transactionsByDay,
  }
}

// =============================================================================
// Employee Report
// =============================================================================

export async function getEmployeeReport(
  dateFrom?: string,
  dateTo?: string
): Promise<{ rows: EmployeeReportRow[] } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()

  // Get all active employees with their divisions
  const { data: employees, error: empError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, monthly_spending_limit')
    .eq('is_active', true)

  if (empError) return { error: 'Failed to fetch employees' }

  // Fetch auth users to get emails (email lives in auth.users, not profiles)
  const adminClient = createAdminClient()
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  for (const u of authData?.users || []) {
    emailMap.set(u.id, u.email || '')
  }

  // Get employee divisions
  const { data: empDivisions } = await supabase
    .from('employee_divisions')
    .select('employee_id, divisions(name)')

  // Get transactions in date range
  let txnQuery = supabase.from('transactions').select('*')
  if (dateFrom) txnQuery = txnQuery.gte('created_at', dateFrom)
  if (dateTo) txnQuery = txnQuery.lte('created_at', dateTo + 'T23:59:59.999Z')
  const { data: transactions } = await txnQuery

  const txns = transactions || []

  // Get default spending limit from app_settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'default_spending_limit')
    .single()
  const defaultLimit = settings?.value ? Number(settings.value) : 500

  // Build division map per employee
  const divMap = new Map<string, string[]>()
  for (const ed of empDivisions || []) {
    const empId = ed.employee_id as string
    const divName =
      ed.divisions && typeof ed.divisions === 'object' && 'name' in ed.divisions
        ? (ed.divisions as { name: string }).name
        : ''
    if (!divMap.has(empId)) divMap.set(empId, [])
    if (divName) divMap.get(empId)!.push(divName)
  }

  // Build transaction aggregates per employee
  const txnMap = new Map<
    string,
    { count: number; original: number; discount: number; final: number }
  >()
  for (const t of txns) {
    const empId = t.employee_id as string
    const existing = txnMap.get(empId) || {
      count: 0,
      original: 0,
      discount: 0,
      final: 0,
    }
    existing.count++
    existing.original += t.original_amount || 0
    existing.discount += t.discount_amount || 0
    existing.final += t.final_amount || 0
    txnMap.set(empId, existing)
  }

  const rows: EmployeeReportRow[] = (employees || []).map((emp) => {
    const txnData = txnMap.get(emp.id) || {
      count: 0,
      original: 0,
      discount: 0,
      final: 0,
    }
    const limit = emp.monthly_spending_limit ?? defaultLimit
    const usagePct = limit > 0 ? (txnData.final / limit) * 100 : 0

    return {
      id: emp.id,
      name: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emailMap.get(emp.id) || '',
      email: emailMap.get(emp.id) || '',
      division_names: divMap.get(emp.id) || [],
      transaction_count: txnData.count,
      total_original: txnData.original,
      total_discount: txnData.discount,
      total_final: txnData.final,
      monthly_limit: limit,
      limit_usage_pct: Math.min(usagePct, 100),
    }
  })

  return { rows }
}

// =============================================================================
// Division Report
// =============================================================================

export async function getDivisionReport(
  dateFrom?: string,
  dateTo?: string
): Promise<{ rows: DivisionReportRow[] } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()

  // Get all divisions
  const { data: divisions, error: divError } = await supabase
    .from('divisions')
    .select('id, name, code')
    .eq('is_active', true)

  if (divError) return { error: 'Failed to fetch divisions' }

  // Get transactions
  let txnQuery = supabase.from('transactions').select('*')
  if (dateFrom) txnQuery = txnQuery.gte('created_at', dateFrom)
  if (dateTo) txnQuery = txnQuery.lte('created_at', dateTo + 'T23:59:59.999Z')
  const { data: transactions } = await txnQuery

  const txns = transactions || []

  // Aggregate per division
  const divAgg = new Map<
    string,
    {
      count: number
      original: number
      discount: number
      final: number
      employees: Set<string>
      discountSum: number
    }
  >()

  for (const t of txns) {
    const divId = t.division_id as string
    const existing = divAgg.get(divId) || {
      count: 0,
      original: 0,
      discount: 0,
      final: 0,
      employees: new Set<string>(),
      discountSum: 0,
    }
    existing.count++
    existing.original += t.original_amount || 0
    existing.discount += t.discount_amount || 0
    existing.final += t.final_amount || 0
    existing.employees.add(t.employee_id as string)
    existing.discountSum += t.discount_percentage || 0
    divAgg.set(divId, existing)
  }

  const rows: DivisionReportRow[] = (divisions || []).map((div) => {
    const agg = divAgg.get(div.id) || {
      count: 0,
      original: 0,
      discount: 0,
      final: 0,
      employees: new Set<string>(),
      discountSum: 0,
    }

    return {
      id: div.id,
      name: div.name,
      code: div.code,
      transaction_count: agg.count,
      total_original: agg.original,
      total_discount: agg.discount,
      total_final: agg.final,
      unique_employees: agg.employees.size,
      avg_discount_pct: agg.count > 0 ? agg.discountSum / agg.count : 0,
    }
  })

  return { rows }
}

// =============================================================================
// Monthly Trends
// =============================================================================

export async function getMonthlyTrends(): Promise<
  { trends: MonthlyTrend[] } | { error: string }
> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()

  // Get last 6 months of transactions
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', sixMonthsAgo.toISOString())

  if (error) return { error: 'Failed to fetch transactions' }

  const txns = transactions || []

  // Group by month
  const byMonth = new Map<
    string,
    {
      transactions: number
      total_original: number
      total_discount: number
      employees: Set<string>
    }
  >()

  for (const t of txns) {
    const date = t.created_at?.split('T')[0] || ''
    if (!date) continue
    const month = date.substring(0, 7) // YYYY-MM
    const existing = byMonth.get(month) || {
      transactions: 0,
      total_original: 0,
      total_discount: 0,
      employees: new Set<string>(),
    }
    existing.transactions++
    existing.total_original += t.original_amount || 0
    existing.total_discount += t.discount_amount || 0
    existing.employees.add(t.employee_id as string)
    byMonth.set(month, existing)
  }

  const trends: MonthlyTrend[] = Array.from(byMonth.entries())
    .map(([month, data]) => ({
      month,
      transactions: data.transactions,
      total_original: data.total_original,
      total_discount: data.total_discount,
      unique_employees: data.employees.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return { trends }
}

// =============================================================================
// CSV Exports
// =============================================================================

export async function exportEmployeeReportCSV(
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string } | { error: string }> {
  const result = await getEmployeeReport(dateFrom, dateTo)
  if ('error' in result) return { error: result.error }

  const headers = [
    'Employee',
    'Email',
    'Divisions',
    'Transactions',
    'Total Purchases (EUR)',
    'Total Savings (EUR)',
    'Total Final (EUR)',
    'Monthly Limit (EUR)',
    'Usage %',
  ]

  const csvRows = result.rows.map((r) =>
    [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.division_names.join(', ')}"`,
      r.transaction_count,
      r.total_original.toFixed(2),
      r.total_discount.toFixed(2),
      r.total_final.toFixed(2),
      r.monthly_limit.toFixed(2),
      r.limit_usage_pct.toFixed(1),
    ].join(',')
  )

  const csv = [headers.join(','), ...csvRows].join('\n')
  return { csv }
}

export async function exportDivisionReportCSV(
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string } | { error: string }> {
  const result = await getDivisionReport(dateFrom, dateTo)
  if ('error' in result) return { error: result.error }

  const headers = [
    'Division',
    'Code',
    'Transactions',
    'Total Purchases (EUR)',
    'Total Savings (EUR)',
    'Total Final (EUR)',
    'Unique Employees',
    'Avg Discount %',
  ]

  const csvRows = result.rows.map((r) =>
    [
      `"${r.name}"`,
      `"${r.code}"`,
      r.transaction_count,
      r.total_original.toFixed(2),
      r.total_discount.toFixed(2),
      r.total_final.toFixed(2),
      r.unique_employees,
      r.avg_discount_pct.toFixed(1),
    ].join(',')
  )

  const csv = [headers.join(','), ...csvRows].join('\n')
  return { csv }
}

export async function exportTransactionsCSV(
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z')

  const { data: transactions, error } = await query

  if (error) return { error: 'Failed to fetch transactions' }

  const headers = [
    'ID',
    'Date',
    'Employee ID',
    'Division ID',
    'Original Amount (EUR)',
    'Discount %',
    'Discount Amount (EUR)',
    'Final Amount (EUR)',
    'Location',
  ]

  const csvRows = (transactions || []).map((t) =>
    [
      t.id,
      t.created_at,
      t.employee_id,
      t.division_id,
      (t.original_amount || 0).toFixed(2),
      (t.discount_percentage || 0).toFixed(1),
      (t.discount_amount || 0).toFixed(2),
      (t.final_amount || 0).toFixed(2),
      `"${t.location || ''}"`,
    ].join(',')
  )

  const csv = [headers.join(','), ...csvRows].join('\n')
  return { csv }
}
