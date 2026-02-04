import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/layout/nav-bar'
import { OnlineStatus } from '@/components/pwa/online-status'
import { InstallPrompt } from '@/components/pwa/install-prompt'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <OnlineStatus />
      <NavBar
        role={profile?.role ?? 'employee'}
        userName={profile?.first_name ?? null}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <InstallPrompt />
    </div>
  )
}
