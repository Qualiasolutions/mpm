import { getDivisions } from '@/actions/admin'
import { DiscountRulesTable } from '@/components/admin/discount-rules-table'

export default async function DiscountsPage() {
  const result = await getDivisions()
  const divisions = 'divisions' in result ? result.divisions : []

  // Default spending limit -- ideally fetched from a settings table
  // For now using a sensible default. The updateDefaultSpendingLimit action
  // will persist changes to the database.
  const defaultSpendingLimit = 500

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Discount Rules
      </h1>

      <DiscountRulesTable
        divisions={divisions}
        defaultSpendingLimit={defaultSpendingLimit}
      />
    </div>
  )
}
