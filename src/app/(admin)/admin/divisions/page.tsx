import { getDivisions } from '@/actions/admin'
import { DivisionList } from '@/components/admin/division-list'

export default async function DivisionsPage() {
  const result = await getDivisions()
  const divisions = 'divisions' in result ? result.divisions : []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-light tracking-wide text-neutral-200">
        Division Management
      </h1>

      <DivisionList divisions={divisions} />
    </div>
  )
}
