import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div>
      <h2 className="mb-6 text-center text-lg font-medium text-neutral-200">
        Employee Login
      </h2>

      {params.error === 'auth-code-error' && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Authentication failed. Please try signing in again.
        </div>
      )}

      {params.error === 'confirmation-failed' && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Email confirmation failed. Please request a new link.
        </div>
      )}

      <LoginForm />
    </div>
  )
}
