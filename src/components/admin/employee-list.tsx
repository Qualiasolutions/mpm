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
    'bg-teal-50 text-teal-600 border-teal-200',
    'bg-sky-50 text-sky-600 border-sky-200',
    'bg-violet-50 text-violet-600 border-violet-200',
    'bg-emerald-50 text-emerald-600 border-emerald-200',
    'bg-rose-50 text-rose-600 border-rose-200',
    'bg-amber-50 text-amber-600 border-amber-200',
  ]

  function getDivisionColor(index: number) {
    return chipColors[index % chipColors.length]
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-slate-200 text-slate-800'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-slate-400">
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
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Email
                </th>
                <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                  Divisions
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-400"
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
                  className="transition-colors hover:bg-slate-50"
                >
                  {/* Name */}
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                        {(emp.first_name?.[0] ?? '').toUpperCase()}
                        {(emp.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {emp.first_name ?? ''} {emp.last_name ?? ''}
                        </p>
                        {emp.role === 'admin' && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-teal-600">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                    {emp.email}
                  </td>

                  {/* Divisions */}
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {emp.divisions.length === 0 && (
                        <span className="text-xs text-slate-400">--</span>
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
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
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
                        className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
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
                            ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                            : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
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
        <div className="border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-400">
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
