'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'mpm-pwa-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const timestamp = parseInt(dismissed, 10)
  if (isNaN(timestamp)) return false
  return Date.now() - timestamp < DISMISS_DURATION_MS
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  )
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault()
    deferredPrompt.current = e as BeforeInstallPromptEvent

    // Only show on mobile, not already dismissed, not already installed
    if (isMobileDevice() && !isDismissed() && !isStandalone()) {
      setShow(true)
    }
  }, [])

  useEffect(() => {
    // Don't show if already in standalone mode
    if (isStandalone()) return

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [handleBeforeInstallPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return

    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice

    if (outcome === 'accepted') {
      dismiss(false)
    }

    deferredPrompt.current = null
  }

  const dismiss = (saveToStorage = true) => {
    setIsClosing(true)
    if (saveToStorage) {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    }
    setTimeout(() => {
      setShow(false)
      setIsClosing(false)
    }, 300)
  }

  if (!show) return null

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-[9998]
        transition-all duration-300 ease-out
        ${isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
      `}
      role="banner"
    >
      <div className="mx-auto max-w-lg px-4 pb-4">
        <div
          className="
            flex items-center gap-3
            rounded-xl
            border border-teal-200
            bg-white/95 backdrop-blur-md
            px-4 py-3
            shadow-lg shadow-slate-200/40
          "
        >
          {/* App icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 border border-teal-200">
            <span className="text-teal-600 font-bold text-sm">MPM</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              Install MPM Discounts
            </p>
            <p className="text-xs text-slate-400">
              Quick access from your home screen
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => dismiss(true)}
              className="
                px-3 py-1.5
                text-xs font-medium
                text-slate-400
                hover:text-slate-600
                transition-colors
                rounded-md
              "
              aria-label="Dismiss install prompt"
            >
              Not Now
            </button>
            <button
              onClick={handleInstall}
              className="
                px-4 py-1.5
                text-xs font-semibold
                text-white
                bg-teal-600
                hover:bg-teal-700
                rounded-md
                transition-colors
              "
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
