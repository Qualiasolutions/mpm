import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/layout/nav-bar'
import { OnlineStatus } from '@/components/pwa/online-status'

export default async function AdminLayout({
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

  if (profile?.role !== 'admin') {
    redirect('/access-denied')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <OnlineStatus />
      <NavBar role="admin" userName={profile.first_name ?? null} />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  )
}
