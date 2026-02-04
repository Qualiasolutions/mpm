'use client'

import { useState, useRef, useEffect } from 'react'

interface ManualEntryProps {
  onSubmit: (code: string, amount: number, location?: string) => void
  isProcessing: boolean
}

export function ManualEntry({ onSubmit, isProcessing }: ManualEntryProps) {
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState<{ code?: string; amount?: string }>({})
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    codeInputRef.current?.focus()
  }, [])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase()

    // Strip the MPM- prefix if the user types it (we show it as a label)
    if (value.startsWith('MPM-')) {
      value = value.slice(4)
    }

    // Only allow alphanumeric characters
    value = value.replace(/[^A-Z0-9]/g, '')

    // Limit to 6 characters
    if (value.length <= 6) {
      setCode(value)
      if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }))
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Allow only valid decimal input
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value)
      if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: { code?: string; amount?: string } = {}

    if (code.length !== 6) {
      newErrors.code = 'Code must be 6 characters (MPM-XXXXXX)'
    }

    const numericAmount = parseFloat(amount)
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Enter a valid purchase amount'
    } else if (numericAmount > 100000) {
      newErrors.amount = 'Amount seems too high. Please verify.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const fullCode = `MPM-${code}`
    const numericAmount = parseFloat(amount)
    onSubmit(fullCode, numericAmount, location || undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="discount-code"
          className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
        >
          Discount Code
        </label>
        <div className="flex items-stretch">
          <div className="flex items-center rounded-l-lg border border-r-0 border-white/[0.06] bg-white/[0.04] px-3.5">
            <span className="font-mono text-sm text-[#D4A853]/70">MPM-</span>
          </div>
          <input
            ref={codeInputRef}
            id="discount-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="XXXXXX"
            value={code}
            onChange={handleCodeChange}
            disabled={isProcessing}
            className={`flex-1 rounded-r-lg border bg-white/[0.02] px-4 py-3.5 font-mono text-lg tracking-[0.15em] text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:ring-1 disabled:opacity-50 ${
              errors.code
                ? 'border-red-500/30 focus:ring-red-500/30'
                : 'border-white/[0.06] focus:ring-[#D4A853]/30'
            }`}
          />
        </div>
        {errors.code && (
          <p className="text-xs text-red-400">{errors.code}</p>
        )}
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="purchase-amount"
          className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
        >
          Purchase Amount
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <span className="text-lg text-neutral-500">EUR</span>
          </div>
          <input
            id="purchase-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            disabled={isProcessing}
            className={`w-full rounded-lg border bg-white/[0.02] py-3.5 pl-16 pr-4 text-right text-2xl font-light tabular-nums text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:ring-1 disabled:opacity-50 ${
              errors.amount
                ? 'border-red-500/30 focus:ring-red-500/30'
                : 'border-white/[0.06] focus:ring-[#D4A853]/30'
            }`}
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-red-400">{errors.amount}</p>
        )}
      </div>

      {/* Location Input (Optional) */}
      <div className="space-y-1.5">
        <label
          htmlFor="store-location"
          className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
        >
          Store / Location{' '}
          <span className="normal-case tracking-normal text-neutral-700">
            (optional)
          </span>
        </label>
        <input
          id="store-location"
          type="text"
          autoComplete="off"
          placeholder="e.g. Limassol Store"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isProcessing}
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#D4A853]/30 disabled:opacity-50"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !code || !amount}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A853] px-6 py-4 text-base font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#D4A853]"
      >
        {isProcessing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0A0B]/20 border-t-[#0A0A0B]" />
            Validating...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Validate Code
          </>
        )}
      </button>
    </form>
  )
}
