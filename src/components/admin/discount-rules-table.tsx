'use client'

import { useActionState, useState } from 'react'
import { updateDiscountRule, updateDefaultSpendingLimit } from '@/actions/admin'
import type { Division, ActionState } from '@/types'

interface DiscountRulesTableProps {
  divisions: Division[]
  defaultSpendingLimit: number
}

export function DiscountRulesTable({
  divisions,
  defaultSpendingLimit,
}: DiscountRulesTableProps) {
  return (
    <div className="space-y-8">
      {/* Discount Rules */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">
            Division Discount Rules
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Division
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Code
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Discount %
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {divisions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    No divisions found. Create divisions first.
                  </td>
                </tr>
              )}
              {divisions.map((div) => (
                <DiscountRuleRow key={div.id} division={div} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Default Spending Limit */}
      <DefaultSpendingLimitSection limit={defaultSpendingLimit} />
    </div>
  )
}

function DiscountRuleRow({ division }: { division: Division }) {
  const rule = division.discount_rule
  const [isEditing, setIsEditing] = useState(false)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateDiscountRule,
    null
  )

  if (state?.success && isEditing) {
    setIsEditing(false)
  }

  return (
    <tr className="transition-colors hover:bg-slate-50">
      {/* Division Name */}
      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
        {division.name}
      </td>

      {/* Code */}
      <td className="whitespace-nowrap px-5 py-3.5">
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500">
          {division.code}
        </span>
      </td>

      {/* Discount % */}
      <td className="whitespace-nowrap px-5 py-3.5">
        {isEditing ? (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="divisionId" value={division.id} />
            {rule && <input type="hidden" name="id" value={rule.id} />}
            <div className="relative w-24">
              <input
                name="discountPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                defaultValue={rule?.discount_percentage ?? 0}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 pr-8 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
                autoFocus
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                %
              </span>
            </div>
            <select
              name="isActive"
              defaultValue={rule?.is_active !== false ? 'true' : 'false'}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            >
              <option value="true" className="bg-white">
                Active
              </option>
              <option value="false" className="bg-white">
                Inactive
              </option>
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <span className="text-lg font-light tabular-nums text-slate-800">
            {rule?.discount_percentage ?? 0}
            <span className="ml-0.5 text-sm text-slate-400">%</span>
          </span>
        )}
        {state?.error && !isEditing && (
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        )}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-5 py-3.5">
        {!isEditing &&
          (rule?.is_active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {rule ? 'Inactive' : 'No Rule'}
            </span>
          ))}
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-5 py-3.5">
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}

function DefaultSpendingLimitSection({ limit }: { limit: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateDefaultSpendingLimit,
    null
  )

  if (state?.success && isEditing) {
    setIsEditing(false)
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-light tracking-wide text-slate-800">
            Default Monthly Spending Limit
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Applied to employees who do not have an individual limit set.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Edit
          </button>
        )}
      </div>

      {state?.error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {state.error}
        </div>
      )}

      {isEditing ? (
        <form
          action={formAction}
          className="mt-4 flex items-end gap-3"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Limit (EUR)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                EUR
              </span>
              <input
                name="limit"
                type="number"
                min="0"
                step="0.01"
                defaultValue={limit}
                className="w-48 rounded-md border border-slate-300 bg-white py-2.5 pl-14 pr-3.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-3xl font-light tabular-nums text-slate-900">
            <span className="mr-1.5 text-lg text-slate-400">EUR</span>
            {limit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      )}

      {state?.success && (
        <p className="mt-2 text-xs text-emerald-600">
          {state.message || 'Spending limit updated.'}
        </p>
      )}
    </div>
  )
}
