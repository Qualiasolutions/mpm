import Link from 'next/link'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-light tracking-wide text-neutral-200">
        Admin Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Employee Management -- Active */}
        <Link
          href="/admin/employees"
          className="group rounded-lg border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-5 transition-colors hover:border-[#D4A853]/25 hover:bg-[#D4A853]/[0.06]"
        >
          <div className="mb-3 text-[#D4A853]/60">
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
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[#D4A853]/80 transition-colors group-hover:text-[#D4A853]">
            Employee Management
          </h3>
          <p className="mt-1 text-xs text-neutral-600">
            Create and manage employee accounts
          </p>
        </Link>

        {/* Division Management -- Placeholder */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 opacity-50">
          <div className="mb-3 text-neutral-600">
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
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-neutral-400">
            Division Management
          </h3>
          <p className="mt-1 text-xs text-neutral-600">Coming in Phase 2</p>
        </div>

        {/* Discount Rules -- Placeholder */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 opacity-50">
          <div className="mb-3 text-neutral-600">
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
            >
              <circle cx="9" cy="9" r="2" />
              <circle cx="15" cy="15" r="2" />
              <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" />
              <rect x="2" y="2" width="20" height="20" rx="2" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-neutral-400">
            Discount Rules
          </h3>
          <p className="mt-1 text-xs text-neutral-600">Coming in Phase 3</p>
        </div>
      </div>
    </div>
  )
}
