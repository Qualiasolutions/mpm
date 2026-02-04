'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type AuthActionState } from '@/actions/auth'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    login,
    null
  )

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="Enter your password"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-teal-600/25"
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
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <div className="text-center">
        <Link
          href="/reset-password"
          className="text-sm text-slate-500 transition-colors duration-200 hover:text-teal-600"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  )
}
