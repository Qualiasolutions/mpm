import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4">
      <div className="text-center">
        <div className="mb-6 text-6xl font-bold text-brand-200">403</div>
        <h1 className="text-xl font-semibold text-slate-900">
          Access Denied
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          You do not have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
