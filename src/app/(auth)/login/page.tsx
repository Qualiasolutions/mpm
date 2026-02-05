import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
        <div className="flex flex-col items-center mb-2">
          <Image
            src="/logo.png"
            alt="MPM Imports"
            width={280}
            height={70}
            className="h-12 w-auto sm:h-14"
            priority
          />
          <div className="h-0.5 w-16 bg-brand-600 rounded-full mt-4 mb-2" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Employee Benefits
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            Sign in to manage your discounts and balance
          </p>
        </div>
      </div>

      <div className="rounded-2xl border-0 shadow-xl shadow-slate-200/60 bg-white/80 backdrop-blur-sm p-5 sm:p-8">
        {params.error === 'auth-code-error' && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Authentication failed. Please try signing in again.
          </div>
        )}

        {params.error === 'confirmation-failed' && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Email confirmation failed. Please request a new link.
          </div>
        )}

        <LoginForm />
      </div>

      <p className="text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} MPM Distributors Ltd.
      </p>
    </div>
  )
}
