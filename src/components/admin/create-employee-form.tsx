'use client'

import { useActionState, useRef } from 'react'
import { createEmployee, type CreateEmployeeState } from '@/actions/admin'

export function CreateEmployeeForm() {
  const [state, formAction, isPending] = useActionState<
    CreateEmployeeState,
    FormData
  >(createEmployee, null)

  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  if (state?.success && formRef.current) {
    formRef.current.reset()
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
      <h2 className="mb-6 text-lg font-light tracking-wide text-neutral-200">
        Create New Employee
      </h2>

      {state?.error && (
        <div className="mb-5 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
          {state.message}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
            >
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
            >
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
            placeholder="employee@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="employee"
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

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center rounded-md bg-[#D4A853] px-4 py-2.5 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
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
              Creating...
            </span>
          ) : (
            'Create Employee'
          )}
        </button>
      </form>
    </div>
  )
}
