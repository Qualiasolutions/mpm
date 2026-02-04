'use client'

import { useState, useCallback, useTransition } from 'react'
import type {
  AnalyticsOverview,
  EmployeeReportRow,
  DivisionReportRow,
  MonthlyTrend,
} from '@/types'
import {
  getAnalyticsOverview,
  getEmployeeReport,
  getDivisionReport,
} from '@/actions/analytics'
import { OverviewCards } from './overview-cards'
import { ActivityChart } from './activity-chart'
import { MonthlyTrends } from './monthly-trends'
import { EmployeeReport } from './employee-report'
import { DivisionReport } from './division-report'
import { DateFilter } from './date-filter'

type TabId = 'overview' | 'employees' | 'divisions'

interface AnalyticsDashboardProps {
  initialOverview: AnalyticsOverview
  initialEmployeeRows: EmployeeReportRow[]
  initialDivisionRows: DivisionReportRow[]
  initialTrends: MonthlyTrend[]
}

export function AnalyticsDashboard({
  initialOverview,
  initialEmployeeRows,
  initialDivisionRows,
  initialTrends,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  // Data state
  const [overview, setOverview] = useState(initialOverview)
  const [employeeRows, setEmployeeRows] = useState(initialEmployeeRows)
  const [divisionRows, setDivisionRows] = useState(initialDivisionRows)
  const trends = initialTrends // Trends don't have date filter

  const handleFilterChange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      setDateFrom(from)
      setDateTo(to)

      startTransition(async () => {
        try {
          const [overviewResult, employeeResult, divisionResult] =
            await Promise.all([
              getAnalyticsOverview(from, to),
              getEmployeeReport(from, to),
              getDivisionReport(from, to),
            ])

          if ('totalTransactions' in overviewResult) {
            setOverview(overviewResult)
          }
          if ('rows' in employeeResult) {
            setEmployeeRows(employeeResult.rows)
          }
          if ('rows' in divisionResult) {
            setDivisionRows(divisionResult.rows)
          }
        } catch {
          // Server actions not yet available - keep initial data
        }
      })
    },
    []
  )

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'employees', label: 'Employees' },
    { id: 'divisions', label: 'Divisions' },
  ]

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <DateFilter onFilterChange={handleFilterChange} />
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Updating data...
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[#D4A853]'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[#D4A853]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={isPending ? 'pointer-events-none opacity-60' : ''}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <OverviewCards overview={overview} />
            <ActivityChart data={overview.transactionsByDay} />
            <MonthlyTrends trends={trends} />
          </div>
        )}

        {activeTab === 'employees' && (
          <EmployeeReport
            rows={employeeRows}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}

        {activeTab === 'divisions' && (
          <DivisionReport
            rows={divisionRows}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}
      </div>
    </div>
  )
}
