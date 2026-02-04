import { getRecentValidations } from '@/actions/validation'
import { ValidationTerminal } from '@/components/validation/validation-terminal'

export default async function ValidatePage() {
  const result = await getRecentValidations(10)
  const validations = 'validations' in result ? result.validations : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Validate Discount Code
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Scan or enter a discount code to apply the employee discount
        </p>
      </div>

      <ValidationTerminal initialValidations={validations} />
    </div>
  )
}
