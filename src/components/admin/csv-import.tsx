'use client'

import { useActionState, useRef, useState } from 'react'
import { importEmployeesCSV } from '@/actions/admin'
import type { ImportResult } from '@/types'

type ImportActionState = {
  error?: string
  success?: boolean
  message?: string
  result?: ImportResult
} | null

interface CsvRow {
  first_name: string
  last_name: string
  email: string
  role: string
  divisions: string
  valid: boolean
  error: string | null
  rowIndex: number
}

export function CsvImport() {
  const [state, formAction, isPending] = useActionState<
    ImportActionState,
    FormData
  >(importEmployeesCSV as unknown as (state: ImportActionState, payload: FormData) => Promise<ImportActionState>, null)

  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [showSkipped, setShowSkipped] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function resetState() {
    setFileName(null)
    setParsedRows([])
    setParseError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function parseCSV(text: string): CsvRow[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setParseError('CSV must have a header row and at least one data row.')
      return []
    }

    const header = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/"/g, ''))
    const requiredFields = ['email']
    const missing = requiredFields.filter((f) => !header.includes(f))
    if (missing.length > 0) {
      setParseError(`Missing required columns: ${missing.join(', ')}`)
      return []
    }

    const emailIdx = header.indexOf('email')
    const firstNameIdx = header.indexOf('first_name')
    const lastNameIdx = header.indexOf('last_name')
    const roleIdx = header.indexOf('role')
    const divisionsIdx = header.indexOf('divisions')

    const rows: CsvRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Basic CSV parsing (handles quoted values)
      const values = parseCsvLine(line)

      const email = values[emailIdx]?.trim() ?? ''
      const first_name = firstNameIdx >= 0 ? (values[firstNameIdx]?.trim() ?? '') : ''
      const last_name = lastNameIdx >= 0 ? (values[lastNameIdx]?.trim() ?? '') : ''
      const role = roleIdx >= 0 ? (values[roleIdx]?.trim() ?? 'employee') : 'employee'
      const divisions =
        divisionsIdx >= 0 ? (values[divisionsIdx]?.trim() ?? '') : ''

      // Validate
      let valid = true
      let error: string | null = null

      if (!email) {
        valid = false
        error = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        valid = false
        error = 'Invalid email format'
      } else if (role && !['employee', 'admin'].includes(role.toLowerCase())) {
        valid = false
        error = 'Role must be "employee" or "admin"'
      }

      rows.push({
        first_name,
        last_name,
        email,
        role: role.toLowerCase() || 'employee',
        divisions,
        valid,
        error,
        rowIndex: i + 1,
      })
    }

    return rows
  }

  function parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)
    return values
  }

  function handleFile(file: File) {
    setParseError(null)

    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
      // Set the file to the input for form submission
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidCount = parsedRows.filter((r) => !r.valid).length

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <form ref={formRef} action={formAction}>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            dragOver
              ? 'border-[#D4A853]/40 bg-[#D4A853]/[0.04]'
              : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.02]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-3 text-neutral-600"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-neutral-400">
            {fileName ? (
              <span className="text-[#D4A853]">{fileName}</span>
            ) : (
              <>
                Drag and drop a CSV file, or{' '}
                <span className="text-[#D4A853]">click to browse</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Required columns: email. Optional: first_name, last_name, role,
            divisions
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {parseError}
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-300">
                Preview
                <span className="ml-2 text-neutral-600">
                  ({parsedRows.length} rows)
                </span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400">
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-red-400">
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Row
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      First Name
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Last Name
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Email
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Divisions
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={
                        row.valid
                          ? 'bg-emerald-500/[0.02]'
                          : 'bg-red-500/[0.03]'
                      }
                    >
                      <td className="px-4 py-2.5 tabular-nums text-neutral-600">
                        {row.rowIndex}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {row.first_name || (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {row.last_name || (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {row.email || (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-400">
                        {row.role}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-400">
                        {row.divisions || (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.valid ? (
                          <span className="text-xs text-emerald-400">
                            Valid
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">
                            {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Button */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending || validCount === 0}
                className="flex items-center gap-2 rounded-md bg-[#D4A853] px-5 py-2.5 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[#D4A853]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    Importing...
                  </>
                ) : (
                  `Import ${validCount} Valid Row${validCount !== 1 ? 's' : ''}`
                )}
              </button>
              <button
                type="button"
                onClick={resetState}
                className="rounded-md px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Import Results */}
      {state?.error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.success && state.result && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-medium text-neutral-200">
            Import Complete
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.04] p-3 text-center">
              <p className="text-2xl font-light tabular-nums text-emerald-400">
                {state.result.imported}
              </p>
              <p className="text-xs text-neutral-500">Imported</p>
            </div>
            <div className="rounded-md border border-red-500/15 bg-red-500/[0.04] p-3 text-center">
              <p className="text-2xl font-light tabular-nums text-red-400">
                {state.result.skipped.length}
              </p>
              <p className="text-xs text-neutral-500">Skipped</p>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className="text-2xl font-light tabular-nums text-neutral-300">
                {state.result.total}
              </p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
          </div>

          {/* Skipped Rows */}
          {state.result.skipped.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSkipped(!showSkipped)}
                className="flex items-center gap-2 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
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
                  className={`transition-transform ${showSkipped ? 'rotate-90' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {showSkipped ? 'Hide' : 'Show'} skipped rows (
                {state.result.skipped.length})
              </button>

              {showSkipped && (
                <div className="mt-2 space-y-1">
                  {state.result.skipped.map((skip, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-md bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="tabular-nums text-neutral-600">
                        Row {skip.row}
                      </span>
                      <span className="text-red-400/80">{skip.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
