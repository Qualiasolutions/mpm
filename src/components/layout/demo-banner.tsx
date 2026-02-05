export function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium text-amber-700 sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This platform is for <strong>demonstration purposes only</strong>
          </span>
        </p>
      </div>
    </div>
  )
}
