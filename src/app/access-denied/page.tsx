import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0B] px-4">
      <div className="text-center">
        <div className="mb-6 text-6xl font-light text-[#D4A853]/30">403</div>
        <h1 className="text-xl font-medium tracking-wide text-neutral-200">
          Access Denied
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          You do not have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-200"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
