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
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('manage')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'manage'
              ? 'text-teal-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Manage
          {tab === 'manage' && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-teal-600" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'import'
              ? 'text-teal-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Import CSV
          {tab === 'import' && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-teal-600" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>{tab === 'manage' ? manageContent : importContent}</div>
    </div>
  )
}
