'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface QrScannerProps {
  onScan: (payload: string) => void
  isActive: boolean
}

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'no-detector'

export function QrScanner({ onScan, isActive }: QrScannerProps) {
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScannedRef = useRef<string>('')
  const lastScannedTimeRef = useRef<number>(0)

  // Check for BarcodeDetector support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasBarcodeDetector('BarcodeDetector' in window)
    }
  }, [])

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    stopScanning()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraState('idle')
  }, [stopScanning])

  // Auto-stop when not active
  useEffect(() => {
    if (!isActive && cameraState === 'active') {
      stopCamera()
    }
  }, [isActive, cameraState, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stopScanning])

  const startScanning = useCallback(() => {
    if (!videoRef.current || !detectorRef.current) return

    stopScanning()

    const video = videoRef.current
    const detector = detectorRef.current

    scanIntervalRef.current = setInterval(async () => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return

      try {
        const barcodes = await detector.detect(video)
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue
          const now = Date.now()

          // Deduplicate: don't fire for same code within 3 seconds
          if (
            value !== lastScannedRef.current ||
            now - lastScannedTimeRef.current > 3000
          ) {
            lastScannedRef.current = value
            lastScannedTimeRef.current = now
            onScan(value)
          }
        }
      } catch {
        // Detection can occasionally fail on individual frames, ignore
      }
    }, 250)
  }, [onScan, stopScanning])

  const startCamera = async () => {
    if (hasBarcodeDetector === false) {
      setCameraState('no-detector')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      return
    }

    setCameraState('requesting')

    try {
      // Initialize detector
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraState('active')
          startScanning()
        }
      }
    } catch (err) {
      const error = err as DOMException
      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        setCameraState('denied')
      } else {
        setCameraState('unsupported')
      }
    }
  }

  // Idle state -- start button
  if (cameraState === 'idle' && hasBarcodeDetector !== false) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Placeholder viewfinder */}
          <div className="flex aspect-[4/3] flex-col items-center justify-center p-8">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 animate-pulse-ring">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-600"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="mb-1 text-sm text-slate-700">
              Scan QR Code
            </p>
            <p className="mb-6 text-xs text-slate-400">
              Point the camera at an employee&apos;s discount QR code
            </p>
            <button
              onClick={startCamera}
              className="rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-medium text-white transition-all active:scale-[0.98] hover:bg-brand-700"
            >
              Start Camera
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No BarcodeDetector support
  if (cameraState === 'no-detector' || hasBarcodeDetector === false) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="mb-1 text-sm font-medium text-amber-600">
          Camera Scanning Not Supported
        </p>
        <p className="text-xs text-slate-400">
          This browser does not support QR code scanning.
          <br />
          Please use the manual entry tab instead.
        </p>
      </div>
    )
  }

  // Requesting permission
  if (cameraState === 'requesting') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="text-sm text-slate-500">Requesting camera access...</p>
        <p className="mt-1 text-xs text-slate-400">
          Please allow camera permission when prompted
        </p>
      </div>
    )
  }

  // Permission denied
  if (cameraState === 'denied') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-600"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
            <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
          </svg>
        </div>
        <p className="mb-1 text-sm font-medium text-red-600">
          Camera Access Denied
        </p>
        <p className="mb-4 text-xs text-slate-400">
          Allow camera access in your browser settings to scan QR codes.
        </p>
        <button
          onClick={() => setCameraState('idle')}
          className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm text-slate-500 transition-colors active:scale-[0.98] hover:bg-slate-50 hover:text-slate-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Camera not available
  if (cameraState === 'unsupported') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="mb-1 text-sm font-medium text-amber-600">
          Camera Not Available
        </p>
        <p className="text-xs text-slate-400">
          No camera detected on this device.
          <br />
          Please use the manual entry tab instead.
        </p>
      </div>
    )
  }

  // Active camera state
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-black">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Darkened edges */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Clear scanning area */}
          <div className="relative h-52 w-52 sm:h-60 sm:w-60">
            {/* Cut out the scanning area from the dark overlay */}
            <div className="absolute -inset-[9999px] bg-black/40" style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 104px) calc(50% - 104px), calc(50% - 104px) calc(50% + 104px), calc(50% + 104px) calc(50% + 104px), calc(50% + 104px) calc(50% - 104px), calc(50% - 104px) calc(50% - 104px))',
            }} />

            {/* Corner brackets */}
            <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-brand-500 rounded-tl" />
            <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-brand-500 rounded-tr" />
            <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-brand-500 rounded-bl" />
            <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-brand-500 rounded-br" />

            {/* Scanning line */}
            <div className="animate-scan-line absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Scanning...
          </span>
        </div>
      </div>

      {/* Stop button */}
      <button
        onClick={stopCamera}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 transition-colors active:scale-[0.98] hover:bg-slate-50 hover:text-slate-700"
      >
        Stop Camera
      </button>
    </div>
  )
}

// Type declaration for BarcodeDetector (not in all TS libs)
declare global {
  interface BarcodeDetectorOptions {
    formats?: string[]
  }

  interface DetectedBarcode {
    rawValue: string
    format: string
    boundingBox: DOMRectReadOnly
    cornerPoints: { x: number; y: number }[]
  }

  class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions)
    detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<DetectedBarcode[]>
    static getSupportedFormats(): Promise<string[]>
  }
}
