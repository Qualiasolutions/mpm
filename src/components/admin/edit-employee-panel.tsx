'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateEmployee } from '@/actions/admin'
import type { Employee, ActionState } from '@/types'

interface EditEmployeePanelProps {
  employee: Employee
  divisions: { id: string; name: string; code: string }[]
  onClose: () => void
}

export function EditEmployeePanel({
  employee,
  divisions,
  onClose,
}: EditEmployeePanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateEmployee,
    null
  )

  // Track selected divisions
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(
    employee.divisions.map((d) => d.id)
  )

  // Animate in on mount
  useEffect(() => {
    // Small delay to trigger CSS transition
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Close on success after brief delay
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        handleClose()
      }, 1200)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success])

  // Close with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  function toggleDivision(divId: string) {
    setSelectedDivisions((prev) =>
      prev.includes(divId)
        ? prev.filter((id) => id !== divId)
        : [...prev, divId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-lg transform border-l border-white/[0.06] bg-[#0E0E10] shadow-2xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h2 className="text-lg font-light tracking-wide text-neutral-200">
              Edit Employee
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
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
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {state?.error && (
            <div className="mx-6 mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="mx-6 mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
              {state.message || 'Employee updated successfully.'}
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="flex-1 space-y-5 px-6 py-5">
            <input type="hidden" name="id" value={employee.id} />

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                Email
              </label>
              <p className="rounded-md border border-white/[0.04] bg-white/[0.01] px-3.5 py-2.5 text-sm text-neutral-500">
                {employee.email}
              </p>
            </div>

            {/* First / Last name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-firstName"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  First Name
                </label>
                <input
                  id="edit-firstName"
                  name="firstName"
                  type="text"
                  defaultValue={employee.first_name ?? ''}
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                  placeholder="First name"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-lastName"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  Last Name
                </label>
                <input
                  id="edit-lastName"
                  name="lastName"
                  type="text"
                  defaultValue={employee.last_name ?? ''}
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="edit-role"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
              >
                Role
              </label>
              <select
                id="edit-role"
                name="role"
                defaultValue={employee.role}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              >
                <option value="employee" className="bg-[#111113]">
                  Employee
                </option>
                <option value="admin" className="bg-[#111113]">
                  Admin
                </option>
              </select>
            </div>

            {/* Employee ID */}
            <div>
              <label
                htmlFor="edit-employeeId"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
              >
                Employee ID
                <span className="ml-1 normal-case tracking-normal text-neutral-600">
                  (optional)
                </span>
              </label>
              <input
                id="edit-employeeId"
                name="employeeIdCode"
                type="text"
                defaultValue={employee.employee_id ?? ''}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                placeholder="e.g. EMP-001"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="edit-phone"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
              >
                Phone
                <span className="ml-1 normal-case tracking-normal text-neutral-600">
                  (optional)
                </span>
              </label>
              <input
                id="edit-phone"
                name="phone"
                type="tel"
                defaultValue={employee.phone ?? ''}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                placeholder="+30 ..."
              />
            </div>

            {/* Monthly Spending Limit */}
            <div>
              <label
                htmlFor="edit-spendingLimit"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
              >
                Monthly Spending Limit (EUR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-600">
                  EUR
                </span>
                <input
                  id="edit-spendingLimit"
                  name="monthlySpendingLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={employee.monthly_spending_limit ?? ''}
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] py-2.5 pl-14 pr-3.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Divisions */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                Division Assignments
              </label>
              {/* Hidden input for comma-separated division IDs */}
              <input
                type="hidden"
                name="divisionIds"
                value={selectedDivisions.join(',')}
              />
              <div className="space-y-2 rounded-md border border-white/[0.06] bg-white/[0.01] p-3">
                {divisions.length === 0 && (
                  <p className="text-sm text-neutral-600">
                    No divisions available.
                  </p>
                )}
                {divisions.map((div) => {
                  const isChecked = selectedDivisions.includes(div.id)
                  return (
                    <label
                      key={div.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDivision(div.id)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#D4A853] accent-[#D4A853]"
                      />
                      <span className="text-sm text-neutral-300">
                        {div.name}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {div.code}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-5">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-md bg-[#D4A853] px-5 py-2.5 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
