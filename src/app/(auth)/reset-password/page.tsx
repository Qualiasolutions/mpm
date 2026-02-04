import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div>
      <h2 className="mb-2 text-center text-lg font-medium text-neutral-200">
        Reset Password
      </h2>
      <p className="mb-6 text-center text-xs text-neutral-500">
        Enter your email and we will send you a reset link.
      </p>
      <ResetPasswordForm />
    </div>
  )
}
