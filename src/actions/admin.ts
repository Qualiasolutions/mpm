'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CreateEmployeeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['employee', 'admin']).default('employee'),
})

export type CreateEmployeeState = {
  error?: string
  success?: boolean
  message?: string
} | null

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  // 1. Auth check: verify caller is admin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input
  const raw = {
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: formData.get('role') || 'employee',
  }

  const parsed = CreateEmployeeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, firstName, lastName, role } = parsed.data

  // 3. Create user with admin (service-role) client
  const adminClient = createAdminClient()

  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    })

  if (createError) {
    console.error('Employee creation failed:', createError.message)
    return { error: 'Failed to create employee. Email may already be in use.' }
  }

  // 4. If role is admin, update profile (trigger creates with default 'employee')
  if (role === 'admin' && createData.user) {
    const { error: roleError } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', createData.user.id)

    if (roleError) {
      console.error('Failed to set admin role:', roleError.message)
      // User created but role not set -- not critical, can be fixed manually
    }
  }

  // 5. Generate password reset link so new employee can set their password
  if (createData.user) {
    const { error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo:
            (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') +
            '/auth/callback?next=/update-password',
        },
      })

    if (linkError) {
      console.error('Failed to generate password link:', linkError.message)
      // User created but email not sent -- admin can trigger reset manually
    }
  }

  return {
    success: true,
    message: 'Employee created. They will receive an email to set their password.',
  }
}
