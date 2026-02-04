import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export default function UpdatePasswordPage() {
  return (
    <div>
      <h2 className="mb-2 text-center text-lg font-medium text-slate-800">
        Set New Password
      </h2>
      <p className="mb-6 text-center text-xs text-slate-400">
        Choose a new password for your account.
      </p>
      <UpdatePasswordForm />
    </div>
  )
}
