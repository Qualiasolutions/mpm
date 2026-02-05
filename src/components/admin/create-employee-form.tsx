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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-base font-light tracking-wide text-slate-800 sm:mb-6 sm:text-lg">
        Create New Employee
      </h2>

      {state?.error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {state.message}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
            placeholder="employee@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="employee"
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
          >
            <option value="employee" className="bg-white">
              Employee
            </option>
            <option value="admin" className="bg-white">
              Admin
            </option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
