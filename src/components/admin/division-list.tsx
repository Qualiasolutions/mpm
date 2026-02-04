'use client'

import { useActionState, useState, useTransition } from 'react'
import {
  createDivision,
  updateDivision,
  deleteDivision,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@/actions/admin'
import type { Division, ActionState } from '@/types'

interface DivisionListProps {
  divisions: Division[]
}

export function DivisionList({ divisions }: DivisionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddDivision, setShowAddDivision] = useState(false)
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(
    null
  )
  const [addingBrandDivisionId, setAddingBrandDivisionId] = useState<
    string | null
  >(null)
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [deletingId, startDeleteTransition] = useTransition()

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleDeleteDivision(divId: string) {
    if (!confirm('Delete this division and all its brands?')) return
    startDeleteTransition(async () => {
      await deleteDivision(divId)
    })
  }

  function handleDeleteBrand(brandId: string) {
    if (!confirm('Delete this brand?')) return
    startDeleteTransition(async () => {
      await deleteBrand(brandId)
    })
  }

  return (
    <div className="space-y-4">
      {/* Add Division Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddDivision(!showAddDivision)}
          className="flex items-center gap-2 rounded-md bg-[#D4A853] px-4 py-2 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Division
        </button>
      </div>

      {/* Add Division Form */}
      {showAddDivision && (
        <AddDivisionForm onDone={() => setShowAddDivision(false)} />
      )}

      {/* Division List */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        {divisions.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-neutral-600">
            No divisions yet. Create your first division above.
          </div>
        )}

        <div className="divide-y divide-white/[0.04]">
          {divisions.map((div) => {
            const isExpanded = expandedId === div.id
            const isEditing = editingDivisionId === div.id

            return (
              <div key={div.id}>
                {/* Division Row */}
                {isEditing ? (
                  <EditDivisionForm
                    division={div}
                    onDone={() => setEditingDivisionId(null)}
                  />
                ) : (
                  <div
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Expand Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(div.id)}
                      className="text-neutral-500 transition-colors hover:text-neutral-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-150 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-200">
                        {div.name}
                      </p>
                    </div>

                    {/* Code */}
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-xs font-mono text-neutral-400">
                      {div.code}
                    </span>

                    {/* Brand Count */}
                    <span className="text-xs text-neutral-500">
                      {div.brands.length} brand{div.brands.length !== 1 ? 's' : ''}
                    </span>

                    {/* Status */}
                    {div.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Inactive
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingDivisionId(div.id)}
                        className="rounded-md px-2 py-1.5 text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
                        title="Edit division"
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
                      <button
                        type="button"
                        onClick={() => handleDeleteDivision(div.id)}
                        disabled={deletingId}
                        className="rounded-md px-2 py-1.5 text-red-400/50 transition-colors hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"
                        title="Delete division"
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
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Brands Section */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-white/[0.04] bg-white/[0.01] px-5 py-4 pl-14">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Brands
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            setAddingBrandDivisionId(
                              addingBrandDivisionId === div.id
                                ? null
                                : div.id
                            )
                          }
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[#D4A853]/70 transition-colors hover:bg-[#D4A853]/[0.05] hover:text-[#D4A853]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add Brand
                        </button>
                      </div>

                      {/* Add Brand Form */}
                      {addingBrandDivisionId === div.id && (
                        <AddBrandForm
                          divisionId={div.id}
                          onDone={() => setAddingBrandDivisionId(null)}
                        />
                      )}

                      {/* Brand List */}
                      {div.brands.length === 0 && (
                        <p className="text-xs text-neutral-600">
                          No brands in this division yet.
                        </p>
                      )}
                      <div className="space-y-1">
                        {div.brands.map((brand) => {
                          const isBrandEditing = editingBrandId === brand.id

                          if (isBrandEditing) {
                            return (
                              <EditBrandForm
                                key={brand.id}
                                brand={brand}
                                onDone={() => setEditingBrandId(null)}
                              />
                            )
                          }

                          return (
                            <div
                              key={brand.id}
                              className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/[0.03]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-neutral-300">
                                  {brand.name}
                                </span>
                                {brand.is_active ? (
                                  <span className="text-[10px] text-emerald-400/60">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-red-400/60">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingBrandId(brand.id)}
                                  className="rounded p-1 text-neutral-600 transition-colors hover:bg-white/5 hover:text-neutral-400"
                                  title="Edit brand"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteBrand(brand.id)
                                  }
                                  disabled={deletingId}
                                  className="rounded p-1 text-red-400/40 transition-colors hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"
                                  title="Delete brand"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Inline Forms ───────────────────────────────────────────────── */

function AddDivisionForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createDivision,
    null
  )

  // Close on success
  if (state?.success) {
    onDone()
  }

  return (
    <div className="rounded-lg border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-5">
      <h3 className="mb-4 text-sm font-medium text-neutral-200">
        New Division
      </h3>

      {state?.error && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Name
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              placeholder="e.g. Fashion"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Code
            </label>
            <input
              name="code"
              type="text"
              required
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              placeholder="e.g. FASH"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Description
              <span className="ml-1 normal-case tracking-normal text-neutral-600">
                (optional)
              </span>
            </label>
            <input
              name="description"
              type="text"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
              placeholder="Brief description"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-md bg-[#D4A853] px-4 py-2 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              'Create Division'
            )}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function EditDivisionForm({
  division,
  onDone,
}: {
  division: Division
  onDone: () => void
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateDivision,
    null
  )

  if (state?.success) {
    onDone()
  }

  return (
    <div className="bg-white/[0.03] px-5 py-4">
      {state?.error && (
        <div className="mb-3 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={division.id} />
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Name
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={division.name}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Code
          </label>
          <input
            name="code"
            type="text"
            required
            defaultValue={division.code}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Description
          </label>
          <input
            name="description"
            type="text"
            defaultValue={division.description ?? ''}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Status
          </label>
          <select
            name="isActive"
            defaultValue={division.is_active ? 'true' : 'false'}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
          >
            <option value="true" className="bg-[#111113]">
              Active
            </option>
            <option value="false" className="bg-[#111113]">
              Inactive
            </option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#D4A853] px-3 py-2 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function AddBrandForm({
  divisionId,
  onDone,
}: {
  divisionId: string
  onDone: () => void
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createBrand,
    null
  )

  if (state?.success) {
    onDone()
  }

  return (
    <div className="rounded-md border border-[#D4A853]/10 bg-[#D4A853]/[0.02] p-3">
      {state?.error && (
        <div className="mb-2 text-xs text-red-400">{state.error}</div>
      )}
      <form action={formAction} className="flex items-end gap-3">
        <input type="hidden" name="divisionId" value={divisionId} />
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Brand Name
          </label>
          <input
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
            placeholder="e.g. Gucci"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#D4A853] px-3 py-2 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

function EditBrandForm({
  brand,
  onDone,
}: {
  brand: { id: string; name: string; is_active: boolean; division_id: string }
  onDone: () => void
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateBrand,
    null
  )

  if (state?.success) {
    onDone()
  }

  return (
    <div className="rounded-md bg-white/[0.03] px-3 py-2">
      {state?.error && (
        <div className="mb-2 text-xs text-red-400">{state.error}</div>
      )}
      <form action={formAction} className="flex items-end gap-3">
        <input type="hidden" name="id" value={brand.id} />
        <div className="flex-1">
          <input
            name="name"
            type="text"
            required
            defaultValue={brand.name}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
          />
        </div>
        <select
          name="isActive"
          defaultValue={brand.is_active ? 'true' : 'false'}
          className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
        >
          <option value="true" className="bg-[#111113]">
            Active
          </option>
          <option value="false" className="bg-[#111113]">
            Inactive
          </option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#D4A853] px-3 py-1.5 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
