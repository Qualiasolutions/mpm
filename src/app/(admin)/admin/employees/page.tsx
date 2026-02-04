import { getEmployees, getDivisions } from '@/actions/admin'
import { CreateEmployeeForm } from '@/components/admin/create-employee-form'
import { EmployeeList } from '@/components/admin/employee-list'
import { CsvImport } from '@/components/admin/csv-import'
import { EmployeePageTabs } from './tabs'

export default async function EmployeesPage() {
  const [employeesResult, divisionsResult] = await Promise.all([
    getEmployees(),
    getDivisions(),
  ])

  const employees =
    'employees' in employeesResult ? employeesResult.employees : []
  const divisions =
    'divisions' in divisionsResult
      ? divisionsResult.divisions.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
        }))
      : []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-light tracking-wide text-neutral-200">
        Employee Management
      </h1>

      {/* Create Employee */}
      <div className="max-w-xl">
        <CreateEmployeeForm />
      </div>

      {/* Tabs: Manage / Import */}
      <EmployeePageTabs
        manageContent={
          <EmployeeList employees={employees} divisions={divisions} />
        }
        importContent={<CsvImport />}
      />
    </div>
  )
}
