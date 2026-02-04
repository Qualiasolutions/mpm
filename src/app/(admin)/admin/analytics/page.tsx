import {
  getAnalyticsOverview,
  getEmployeeReport,
  getDivisionReport,
  getMonthlyTrends,
} from '@/actions/analytics'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import type {
  AnalyticsOverview,
  EmployeeReportRow,
  DivisionReportRow,
  MonthlyTrend,
} from '@/types'

const emptyOverview: AnalyticsOverview = {
  totalTransactions: 0,
  totalOriginalAmount: 0,
  totalDiscountAmount: 0,
  totalFinalAmount: 0,
  activeEmployees: 0,
  averageDiscountPercentage: 0,
  transactionsByDay: [],
}

export default async function AnalyticsPage() {
  let overview: AnalyticsOverview = emptyOverview
  let employeeRows: EmployeeReportRow[] = []
  let divisionRows: DivisionReportRow[] = []
  let trends: MonthlyTrend[] = []

  try {
    const [overviewResult, employeeResult, divisionResult, trendsResult] =
      await Promise.all([
        getAnalyticsOverview(),
        getEmployeeReport(),
        getDivisionReport(),
        getMonthlyTrends(),
      ])

    if ('totalTransactions' in overviewResult) {
      overview = overviewResult
    }
    if ('rows' in employeeResult) {
      employeeRows = employeeResult.rows
    }
    if ('rows' in divisionResult) {
      divisionRows = divisionResult.rows
    }
    if ('trends' in trendsResult) {
      trends = trendsResult.trends
    }
  } catch {
    // Server actions may not be available yet - use empty defaults
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Analytics & Reporting
      </h1>

      <AnalyticsDashboard
        initialOverview={overview}
        initialEmployeeRows={employeeRows}
        initialDivisionRows={divisionRows}
        initialTrends={trends}
      />
    </div>
  )
}
