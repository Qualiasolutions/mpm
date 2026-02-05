import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/layout/nav-bar'
import { DemoBanner } from '@/components/layout/demo-banner'
import { Footer } from '@/components/layout/footer'
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <DemoBanner />
      <OnlineStatus />
      <NavBar
        role={profile?.role ?? 'employee'}
        userName={profile?.first_name ?? null}
      />
      <main className="mx-auto max-w-lg px-4 py-4 sm:py-8 flex-1 w-full">
        {children}
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  )
}
