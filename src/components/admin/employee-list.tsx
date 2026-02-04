'use client'

import { useState, useTransition } from 'react'
import { toggleEmployeeStatus } from '@/actions/admin'
import { EditEmployeePanel } from './edit-employee-panel'
import type { Employee } from '@/types'

interface EmployeeListProps {
  employees: Employee[]
  divisions: { id: string; name: string; code: string }[]
}

type FilterTab = 'all' | 'active' | 'inactive'

export function EmployeeList({ employees, divisions }: EmployeeListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [togglingId, startToggle] = useTransition()

  // Filter and search
  const filtered = employees.filter((emp) => {
    // Status filter
    if (filter === 'active' && !emp.is_active) return false
    if (filter === 'inactive' && emp.is_active) return false

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const fullName =
        `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.toLowerCase()
      const email = emp.email.toLowerCase()
      return fullName.includes(q) || email.includes(q)
    }

    return true
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: employees.length },
    {
      key: 'active',
      label: 'Active',
      count: employees.filter((e) => e.is_active).length,
    },
    {
      key: 'inactive',
      label: 'Inactive',
      count: employees.filter((e) => !e.is_active).length,
    },
  ]

  function handleToggleStatus(employeeId: string) {
    startToggle(async () => {
      await toggleEmployeeStatus(employeeId)
    })
  }

  // Color map for division chips
  const chipColors = [
    'bg-[#D4A853]/10 text-[#D4A853]/80 border-[#D4A853]/20',
    'bg-sky-500/10 text-sky-400/80 border-sky-500/20',
    'bg-violet-500/10 text-violet-400/80 border-violet-500/20',
    'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20',
    'bg-rose-500/10 text-rose-400/80 border-rose-500/20',
    'bg-amber-500/10 text-amber-400/80 border-amber-500/20',
  ]

  function getDivisionColor(index: number) {
    return chipColors[index % chipColors.length]
  }

  return (
    <>
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 rounded-md border border-white/[0.06] bg-white/[0.01] p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white/[0.08] text-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-neutral-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Email
                </th>
                <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500 md:table-cell">
                  Divisions
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-neutral-600"
                  >
                    {search
                      ? 'No employees match your search.'
                      : 'No employees found.'}
                  </td>
                </tr>
              )}
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  {/* Name */}
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-neutral-400">
                        {(emp.first_name?.[0] ?? '').toUpperCase()}
                        {(emp.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-200">
                          {emp.first_name ?? ''} {emp.last_name ?? ''}
                        </p>
                        {emp.role === 'admin' && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-[#D4A853]/60">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="whitespace-nowrap px-5 py-3.5 text-neutral-400">
                    {emp.email}
                  </td>

                  {/* Divisions */}
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {emp.divisions.length === 0 && (
                        <span className="text-xs text-neutral-600">--</span>
                      )}
                      {emp.divisions.map((div, i) => (
                        <span
                          key={div.id}
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getDivisionColor(i)}`}
                        >
                          {div.code}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {emp.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingEmployee(emp)}
                        className="rounded-md px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
                        title="Edit employee"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp.id)}
                        disabled={togglingId}
                        className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                          emp.is_active
                            ? 'text-red-400/60 hover:bg-red-500/5 hover:text-red-400'
                            : 'text-emerald-400/60 hover:bg-emerald-500/5 hover:text-emerald-400'
                        } disabled:opacity-50`}
                        title={
                          emp.is_active
                            ? 'Deactivate employee'
                            : 'Activate employee'
                        }
                      >
                        {emp.is_active ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-xs text-neutral-600">
            Showing {filtered.length} of {employees.length} employees
          </p>
        </div>
      </div>

      {/* Edit Panel */}
      {editingEmployee && (
        <EditEmployeePanel
          employee={editingEmployee}
          divisions={divisions}
          onClose={() => setEditingEmployee(null)}
        />
      )}
    </>
  )
}
