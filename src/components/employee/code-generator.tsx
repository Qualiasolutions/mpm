'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { generateDiscountCode } from '@/actions/employee'
import type { DiscountCode } from '@/types'

interface CodeGeneratorProps {
  divisionId: string
  divisionName: string
  discountPercentage: number
  onBack: () => void
}

type GeneratorState = 'idle' | 'loading' | 'active' | 'expired' | 'error'

export function CodeGenerator({
  divisionId,
  divisionName,
  discountPercentage,
  onBack,
}: CodeGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle')
  const [code, setCode] = useState<DiscountCode | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startCountdown = useCallback(
    (expiresAt: string) => {
      clearTimer()

      const updateRemaining = () => {
        const now = Date.now()
        const expiry = new Date(expiresAt).getTime()
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000))

        setSecondsRemaining(remaining)
        if (remaining <= 0) {
          setState('expired')
          clearTimer()
        }
      }

      updateRemaining()
      timerRef.current = setInterval(updateRemaining, 1000)
    },
    [clearTimer]
  )

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const handleGenerate = async () => {
    setState('loading')
    setErrorMessage('')
    setCopied(false)

    try {
      const result = await generateDiscountCode(divisionId)

      if ('error' in result) {
        setState('error')
        setErrorMessage(result.error)
        return
      }

      const discountCode = result.code

      // Generate QR code
      const dataUrl = await QRCode.toDataURL(discountCode.qr_payload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#D4A853',
          light: '#0A0A0B',
        },
      })

      setCode(discountCode)
      setQrDataUrl(dataUrl)
      setState('active')
      startCountdown(discountCode.expires_at)
    } catch {
      setState('error')
      setErrorMessage('Failed to generate code. Please try again.')
    }
  }

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code.manual_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text for manual copy
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timerColor =
    secondsRemaining <= 30
      ? 'text-red-400'
      : secondsRemaining <= 60
        ? 'text-yellow-400'
        : 'text-neutral-200'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-neutral-400 transition-colors active:scale-95 hover:bg-white/[0.05] hover:text-neutral-200"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-medium text-neutral-200">{divisionName}</h2>
          <p className="text-xs text-[#D4A853]">{discountPercentage}% discount</p>
        </div>
      </div>

      {/* Idle State */}
      {state === 'idle' && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D4A853]/[0.08]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#D4A853]"
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
          <p className="mb-1 text-sm text-neutral-300">
            Generate a one-time discount code
          </p>
          <p className="mb-5 text-xs text-neutral-500">
            The code will expire after a set time
          </p>
          <button
            onClick={handleGenerate}
            className="w-full rounded-lg bg-[#D4A853] px-5 py-3 text-sm font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90"
          >
            Generate Code
          </button>
        </div>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#D4A853]/20 border-t-[#D4A853]" />
          <p className="text-sm text-neutral-400">Generating your code...</p>
        </div>
      )}

      {/* Active State */}
      {state === 'active' && code && qrDataUrl && (
        <div className="space-y-4">
          {/* Timer */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">
              Expires in
            </p>
            <p
              className={`text-3xl font-light tabular-nums tracking-tight transition-colors ${timerColor}`}
            >
              {formatTime(secondsRemaining)}
            </p>
            {secondsRemaining <= 30 && (
              <p className="mt-1 text-[10px] text-red-400/70">Code expiring soon</p>
            )}
          </div>

          {/* QR Code */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 text-center">
            <div className="mx-auto mb-3 inline-block overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Discount QR Code"
                width={220}
                height={220}
                className="block"
              />
            </div>
            <p className="text-[10px] text-neutral-600">
              Show this QR code at checkout
            </p>
          </div>

          {/* Manual Code */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-neutral-500">
              Or use this code
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-white/[0.03] px-4 py-3 text-center font-mono text-xl tracking-[0.15em] text-[#D4A853]">
                {code.manual_code}
              </div>
              <button
                onClick={handleCopy}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-neutral-400 transition-all active:scale-95 hover:bg-white/[0.05] hover:text-neutral-200"
              >
                {copied ? (
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
                    className="text-green-400"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-center text-xs text-green-400">
                Copied to clipboard
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expired State */}
      {state === 'expired' && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/[0.1]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-medium text-red-400">Code Expired</p>
          <p className="mb-4 text-xs text-neutral-500">
            Generate a new code when you&apos;re ready
          </p>
          <button
            onClick={handleGenerate}
            className="w-full rounded-lg bg-[#D4A853] px-5 py-3 text-sm font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90"
          >
            Generate New Code
          </button>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/[0.1]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-medium text-red-400">
            Unable to generate code
          </p>
          <p className="mb-4 text-xs text-neutral-500">{errorMessage}</p>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-neutral-400 transition-colors active:scale-[0.98] hover:bg-white/[0.05]"
            >
              Go Back
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 rounded-lg bg-[#D4A853] px-4 py-3 text-sm font-medium text-[#0A0A0B] transition-all active:scale-[0.98] hover:bg-[#D4A853]/90"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
