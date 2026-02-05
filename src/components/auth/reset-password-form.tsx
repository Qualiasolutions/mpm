'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type AuthActionState } from '@/actions/auth'

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    null
  )

  if (state?.success) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-600">
          Check your email for a reset link. It may take a minute to arrive.
        </div>
        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-slate-400 transition-colors duration-200 hover:text-brand-600"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium tracking-wide text-slate-500"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@mpmimports.com.cy"
          className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors duration-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
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
            Sending...
          </span>
        ) : (
          'Send Reset Link'
        )}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-xs text-slate-400 transition-colors duration-200 hover:text-brand-600"
        >
          Back to login
        </Link>
      </div>
    </form>
  )
}
