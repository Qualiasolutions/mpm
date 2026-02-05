'use client'

import { useState, useCallback } from 'react'
import { validateCode } from '@/actions/validation'
import { QrScanner } from './qr-scanner'
import { ManualEntry } from './manual-entry'
import { ValidationResultView } from './validation-result'
import { RecentValidations } from './recent-validations'
import type { ValidationResult, RecentValidation } from '@/types'

type Tab = 'scan' | 'manual'
type FlowState = 'input' | 'amount-entry' | 'processing' | 'result'

interface ValidationTerminalProps {
  initialValidations: RecentValidation[]
}

export function ValidationTerminal({
  initialValidations,
}: ValidationTerminalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('manual')
  const [flowState, setFlowState] = useState<FlowState>('input')
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [amountForScan, setAmountForScan] = useState('')
  const [locationForScan, setLocationForScan] = useState('')
  const [amountError, setAmountError] = useState('')
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleQrScan = useCallback((payload: string) => {
    // QR payload could be the raw code or JSON; parse it
    let code = payload
    try {
      const parsed = JSON.parse(payload)
      if (parsed.code) code = parsed.code
      else if (parsed.manual_code) code = parsed.manual_code
    } catch {
      // Not JSON, treat as raw code string
    }

    setScannedCode(code)
    setFlowState('amount-entry')
  }, [])

  const processValidation = async (
    code: string,
    amount: number,
    location?: string
  ) => {
    setFlowState('processing')

    try {
      const response = await validateCode(code, amount, location)

      if ('error' in response) {
        // Server action returned a top-level error (auth, validation, etc.)
        setValidationResult({
          success: false,
          error: 'server_error',
          message: response.error,
        })
      } else {
        // Got a ValidationResult from the RPC
        setValidationResult(response.result)
        if (response.result.success) {
          setRefreshKey((prev) => prev + 1)
        }
      }

      setFlowState('result')
    } catch {
      setValidationResult({
        success: false,
        error: 'network_error',
        message: 'Failed to connect. Please check your network and try again.',
      })
      setFlowState('result')
    }
  }

  const handleManualSubmit = async (
    code: string,
    amount: number,
    location?: string
  ) => {
    await processValidation(code, amount, location)
  }

  const handleScanAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numericAmount = parseFloat(amountForScan)
    if (!amountForScan || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Enter a valid purchase amount')
      return
    }
    if (numericAmount > 100000) {
      setAmountError('Amount seems too high. Please verify.')
      return
    }

    setAmountError('')
    await processValidation(
      scannedCode!,
      numericAmount,
      locationForScan || undefined
    )
  }

  const handleReset = () => {
    setFlowState('input')
    setScannedCode(null)
    setAmountForScan('')
    setLocationForScan('')
    setAmountError('')
    setValidationResult(null)
  }

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr,340px]">
      {/* Main Terminal */}
      <div className="space-y-5">
        {/* Processing State */}
        {flowState === 'processing' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-16">
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-base text-slate-700">
              Validating discount code...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Please wait
            </p>
          </div>
        )}

        {/* Result State */}
        {flowState === 'result' && validationResult && (
          <ValidationResultView
            result={validationResult}
            onReset={handleReset}
          />
        )}

        {/* Amount Entry (after QR scan) */}
        {flowState === 'amount-entry' && scannedCode && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-green-500/15 bg-green-500/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/[0.1]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-600"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 7h.01" />
                    <path d="M17 7h.01" />
                    <path d="M7 17h.01" />
                    <path d="M17 17h.01" />
                    <rect x="7" y="7" width="3" height="3" />
                    <rect x="14" y="7" width="3" height="3" />
                    <rect x="7" y="14" width="3" height="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-600">
                    QR Code Scanned
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {scannedCode}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleScanAmountSubmit} className="space-y-4">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="scan-amount"
                  className="block text-xs font-medium uppercase tracking-wider text-slate-400"
                >
                  Purchase Amount
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                    <span className="text-lg text-slate-400">EUR</span>
                  </div>
                  <input
                    id="scan-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    placeholder="0.00"
                    value={amountForScan}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                        setAmountForScan(v)
                        if (amountError) setAmountError('')
                      }
                    }}
                    className={`w-full rounded-lg border bg-white py-3.5 pl-16 pr-4 text-right text-2xl font-light tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 ${
                      amountError
                        ? 'border-red-500/30 focus:ring-red-500/30'
                        : 'border-slate-200 focus:ring-brand-200'
                    }`}
                  />
                </div>
                {amountError && (
                  <p className="text-xs text-red-600">{amountError}</p>
                )}
              </div>

              {/* Optional Location */}
              <div className="space-y-1.5">
                <label
                  htmlFor="scan-location"
                  className="block text-xs font-medium uppercase tracking-wider text-slate-400"
                >
                  Store / Location{' '}
                  <span className="normal-case tracking-normal text-slate-300">
                    (optional)
                  </span>
                </label>
                <input
                  id="scan-location"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Limassol Store"
                  value={locationForScan}
                  onChange={(e) => setLocationForScan(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 transition-colors active:scale-[0.98] hover:bg-slate-50 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!amountForScan}
                  className="flex-[2] rounded-lg bg-brand-600 px-6 py-3.5 text-sm font-medium text-white transition-all active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Validate Code
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Input State - Tab toggle */}
        {flowState === 'input' && (
          <>
            {/* Tab Toggle */}
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
              <button
                onClick={() => setActiveTab('scan')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'scan'
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                QR Scan
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'manual'
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="6" y1="8" x2="6" y2="8.01" />
                  <line x1="10" y1="8" x2="10" y2="8.01" />
                  <line x1="14" y1="8" x2="14" y2="8.01" />
                  <line x1="18" y1="8" x2="18" y2="8.01" />
                  <line x1="6" y1="12" x2="6" y2="12.01" />
                  <line x1="10" y1="12" x2="10" y2="12.01" />
                  <line x1="14" y1="12" x2="14" y2="12.01" />
                  <line x1="18" y1="12" x2="18" y2="12.01" />
                  <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
                Manual Entry
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'scan' && (
                <QrScanner
                  onScan={handleQrScan}
                  isActive={activeTab === 'scan' && flowState === 'input'}
                />
              )}
              {activeTab === 'manual' && (
                <ManualEntry
                  onSubmit={handleManualSubmit}
                  isProcessing={false}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Sidebar: Recent Validations */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <RecentValidations
          initialValidations={initialValidations}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  )
}
