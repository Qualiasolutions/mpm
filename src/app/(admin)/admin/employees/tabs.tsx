'use client'

import { useState } from 'react'

interface EmployeePageTabsProps {
  manageContent: React.ReactNode
  importContent: React.ReactNode
}

export function EmployeePageTabs({
  manageContent,
  importContent,
}: EmployeePageTabsProps) {
  const [tab, setTab] = useState<'manage' | 'import'>('manage')

  return (
    <div className="space-y-6">
      {/* Tab Buttons */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setTab('manage')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'manage'
              ? 'text-[#D4A853]'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Manage
          {tab === 'manage' && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-[#D4A853]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'import'
              ? 'text-[#D4A853]'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Import CSV
          {tab === 'import' && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-[#D4A853]" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>{tab === 'manage' ? manageContent : importContent}</div>
    </div>
  )
}
