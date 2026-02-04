import { CreateEmployeeForm } from '@/components/admin/create-employee-form'

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-light tracking-wide text-neutral-200">
        Employee Management
      </h1>

      <div className="max-w-xl">
        <CreateEmployeeForm />
      </div>

      {/* Placeholder for employee list -- Phase 2 */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-sm text-neutral-600">
          Employee list will appear here in a future update.
        </p>
      </div>
    </div>
  )
}
