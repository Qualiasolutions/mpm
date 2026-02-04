import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root page acts as auth + role router.
// Unauthenticated -> /login
// Admin -> /admin
// Employee -> /dashboard
export default async function RootPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  redirect('/dashboard')
}
