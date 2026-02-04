'use client'

import { useState, useEffect, useCallback } from 'react'

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBackOnline, setShowBackOnline] = useState(false)
  const [mounted, setMounted] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setShowBackOnline(true)
    const timer = setTimeout(() => {
      setShowBackOnline(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setShowBackOnline(false)
  }, [])

  useEffect(() => {
    setMounted(true)
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  if (!mounted) return null

  const showOffline = !isOnline
  const showBanner = showOffline || showBackOnline

  if (!showBanner) return null

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9999]
        flex items-center justify-center gap-2
        px-4 py-2
        text-sm font-medium
        transition-all duration-300 ease-out
        ${showOffline
          ? 'bg-teal-50 border-b border-teal-300 text-teal-600'
          : 'bg-emerald-50 border-b border-emerald-300 text-emerald-600'
        }
        ${showBanner ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
      role="status"
      aria-live="polite"
    >
      {showOffline ? (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 2l20 20" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 12.86a10 10 0 0 1 5.17-2.95" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>You&apos;re offline. Some features may be limited.</span>
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>Back online</span>
        </>
      )}
    </div>
  )
}
