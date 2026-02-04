'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type {
  DiscountCode,
  Transaction,
  SpendingSummary,
  EmployeeDiscount,
} from '@/types'

// =============================================================================
// Shared Helpers
// =============================================================================

const DEFAULT_MONTHLY_LIMIT = 5000

/**
 * Verifies the current user is authenticated and their profile is active.
 * Returns user id and profile data, or an error string.
 */
async function requireEmployee(): Promise<
  | {
      userId: string
      profile: {
        first_name: string | null
        last_name: string | null
        role: string
        is_active: boolean
        employee_id: string | null
        phone: string | null
        monthly_spending_limit: number | null
      }
    }
  | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'first_name, last_name, role, is_active, employee_id, phone, monthly_spending_limit'
    )
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Unauthorized' }
  }

  if (!profile.is_active) {
    return { error: 'Your account has been deactivated. Contact your administrator.' }
  }

  return { userId: user.id, profile }
}

function isAuthError(
  result: { userId: string; profile: Record<string, unknown> } | { error: string }
): result is { error: string } {
  return 'error' in result
}

// =============================================================================
// 1. Get Employee's Available Discounts
// =============================================================================

export async function getMyDiscounts(): Promise<
  { discounts: EmployeeDiscount[] } | { error: string }
> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  const supabase = await createClient()

  // Get divisions assigned to this employee via junction table
  const { data: assignments, error: assignError } = await supabase
    .from('employee_divisions')
    .select(
      'division_id, divisions(id, name, code, is_active, discount_rules(discount_percentage, is_active), brands(id))'
    )
    .eq('employee_id', auth.userId)

  if (assignError) {
    console.error('Failed to fetch employee discounts:', assignError.message)
    return { error: 'Failed to load your discounts.' }
  }

  const discounts: EmployeeDiscount[] = []

  for (const a of assignments || []) {
    const div = a.divisions as unknown as {
      id: string
      name: string
      code: string
      is_active: boolean
      discount_rules: { discount_percentage: number; is_active: boolean }[]
      brands: { id: string }[]
    } | null

    if (!div || !div.is_active) continue

    // Find an active discount rule for this division
    const activeRule = div.discount_rules?.find((r) => r.is_active)
    if (!activeRule) continue

    discounts.push({
      division: { id: div.id, name: div.name, code: div.code },
      discount_percentage: Number(activeRule.discount_percentage),
      brand_count: div.brands?.length ?? 0,
    })
  }

  return { discounts }
}

// =============================================================================
// 2. Get Employee's Spending Summary
// =============================================================================

export async function getMySpendingSummary(): Promise<
  { summary: SpendingSummary } | { error: string }
> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  const supabase = await createClient()

  // Determine the spending limit: profile override or app default
  let limit = auth.profile.monthly_spending_limit
    ? Number(auth.profile.monthly_spending_limit)
    : null

  if (limit === null) {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_monthly_spending_limit')
      .maybeSingle()

    limit = setting?.value ? Number(setting.value) : DEFAULT_MONTHLY_LIMIT
  }

  // Get current month spending via RPC
  const { data: spent, error: spentError } = await supabase.rpc(
    'get_employee_monthly_spending',
    { p_employee_id: auth.userId }
  )

  if (spentError) {
    console.error('Failed to fetch spending:', spentError.message)
    return { error: 'Failed to load spending data.' }
  }

  const spentAmount = Number(spent) || 0
  const remaining = Math.max(0, limit - spentAmount)
  const percentage = limit > 0 ? Math.min(100, (spentAmount / limit) * 100) : 0

  return {
    summary: {
      limit,
      spent: spentAmount,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
    },
  }
}

// =============================================================================
// 3. Generate a Discount Code
// =============================================================================

const GenerateCodeSchema = z.object({
  divisionId: z.string().uuid('Invalid division ID'),
})

export async function generateDiscountCode(
  divisionId: string
): Promise<{ code: DiscountCode } | { error: string }> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  // Validate input
  const parsed = GenerateCodeSchema.safeParse({ divisionId })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // 1. Verify employee is assigned to this division
  const { data: assignment, error: assignError } = await supabase
    .from('employee_divisions')
    .select('division_id')
    .eq('employee_id', auth.userId)
    .eq('division_id', divisionId)
    .maybeSingle()

  if (assignError) {
    console.error('Failed to check division assignment:', assignError.message)
    return { error: 'Failed to verify division access.' }
  }

  if (!assignment) {
    return { error: 'You are not assigned to this division.' }
  }

  // 2. Verify division is active and has an active discount rule
  const { data: division, error: divError } = await supabase
    .from('divisions')
    .select('id, name, is_active, discount_rules(discount_percentage, is_active)')
    .eq('id', divisionId)
    .single()

  if (divError || !division) {
    console.error('Failed to fetch division:', divError?.message)
    return { error: 'Division not found.' }
  }

  if (!division.is_active) {
    return { error: 'This division is currently inactive.' }
  }

  const rules = division.discount_rules as unknown as {
    discount_percentage: number
    is_active: boolean
  }[]
  const activeRule = rules?.find((r) => r.is_active)

  if (!activeRule) {
    return { error: 'No active discount rule for this division.' }
  }

  const discountPercentage = Number(activeRule.discount_percentage)

  // 3. Check monthly spending limit
  let limit = auth.profile.monthly_spending_limit
    ? Number(auth.profile.monthly_spending_limit)
    : null

  if (limit === null) {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_monthly_spending_limit')
      .maybeSingle()

    limit = setting?.value ? Number(setting.value) : DEFAULT_MONTHLY_LIMIT
  }

  const { data: spent, error: spentError } = await supabase.rpc(
    'get_employee_monthly_spending',
    { p_employee_id: auth.userId }
  )

  if (spentError) {
    console.error('Failed to check spending:', spentError.message)
    return { error: 'Failed to verify spending limit.' }
  }

  const spentAmount = Number(spent) || 0

  if (spentAmount >= limit) {
    return {
      error: `You have reached your monthly spending limit of ${limit.toLocaleString()}.`,
    }
  }

  // 4. Expire any existing active codes for this employee (one active at a time)
  const { error: expireError } = await supabase
    .from('discount_codes')
    .update({ status: 'expired' })
    .eq('employee_id', auth.userId)
    .eq('status', 'active')

  if (expireError) {
    console.error('Failed to expire existing codes:', expireError.message)
    // Non-blocking: continue with generation
  }

  // 5. Generate manual code via RPC
  const { data: manualCode, error: codeError } = await supabase.rpc(
    'generate_manual_code'
  )

  if (codeError || !manualCode) {
    console.error('Failed to generate manual code:', codeError?.message)
    return { error: 'Failed to generate discount code. Please try again.' }
  }

  // 6. Build QR payload and insert
  const expiresAt = new Date(Date.now() + 90 * 1000).toISOString()

  const qrPayload = JSON.stringify({
    code_id: null, // Will be set after insert
    employee_id: auth.userId,
    division_id: divisionId,
    manual_code: manualCode,
    discount_percentage: discountPercentage,
    expires_at: expiresAt,
  })

  const { data: insertedCode, error: insertError } = await supabase
    .from('discount_codes')
    .insert({
      employee_id: auth.userId,
      division_id: divisionId,
      discount_percentage: discountPercentage,
      manual_code: manualCode,
      qr_payload: qrPayload,
      status: 'active',
      expires_at: expiresAt,
    })
    .select('id, manual_code, qr_payload, discount_percentage, expires_at, created_at, employee_id, division_id, status')
    .single()

  if (insertError || !insertedCode) {
    console.error('Failed to insert discount code:', insertError?.message)
    return { error: 'Failed to create discount code. Please try again.' }
  }

  // Update QR payload with the actual code_id
  const finalQrPayload = JSON.stringify({
    code_id: insertedCode.id,
    employee_id: auth.userId,
    division_id: divisionId,
    manual_code: manualCode,
    discount_percentage: discountPercentage,
    expires_at: expiresAt,
  })

  const { error: updateError } = await supabase
    .from('discount_codes')
    .update({ qr_payload: finalQrPayload })
    .eq('id', insertedCode.id)

  if (updateError) {
    console.error('Failed to update QR payload:', updateError.message)
    // Non-blocking: code still works via manual_code
  }

  return {
    code: {
      id: insertedCode.id,
      employee_id: insertedCode.employee_id,
      division_id: insertedCode.division_id,
      discount_percentage: Number(insertedCode.discount_percentage),
      manual_code: insertedCode.manual_code,
      qr_payload: finalQrPayload,
      status: insertedCode.status as 'active' | 'used' | 'expired',
      expires_at: insertedCode.expires_at,
      created_at: insertedCode.created_at,
      division_name: division.name,
    },
  }
}

// =============================================================================
// 4. Get Active Discount Code
// =============================================================================

export async function getActiveCode(): Promise<
  { code: DiscountCode | null } | { error: string }
> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  const supabase = await createClient()

  // Get the latest active code for this employee
  const { data: code, error: fetchError } = await supabase
    .from('discount_codes')
    .select(
      'id, employee_id, division_id, discount_percentage, manual_code, qr_payload, status, expires_at, created_at, divisions(name)'
    )
    .eq('employee_id', auth.userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch active code:', fetchError.message)
    return { error: 'Failed to load active code.' }
  }

  if (!code) {
    return { code: null }
  }

  // Check if the code has expired
  const now = new Date()
  const expiresAt = new Date(code.expires_at)

  if (expiresAt <= now) {
    // Mark as expired
    const { error: expireError } = await supabase
      .from('discount_codes')
      .update({ status: 'expired' })
      .eq('id', code.id)

    if (expireError) {
      console.error('Failed to expire code:', expireError.message)
    }

    return { code: null }
  }

  const div = code.divisions as unknown as { name: string } | null

  return {
    code: {
      id: code.id,
      employee_id: code.employee_id,
      division_id: code.division_id,
      discount_percentage: Number(code.discount_percentage),
      manual_code: code.manual_code,
      qr_payload: code.qr_payload,
      status: code.status as 'active' | 'used' | 'expired',
      expires_at: code.expires_at,
      created_at: code.created_at,
      division_name: div?.name || undefined,
    },
  }
}

// =============================================================================
// 5. Get Transaction History
// =============================================================================

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function getMyTransactions(
  page?: number,
  limit?: number
): Promise<
  | {
      transactions: Transaction[]
      total: number
      page: number
      pages: number
    }
  | { error: string }
> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  const parsed = PaginationSchema.safeParse({ page: page ?? 1, limit: limit ?? 20 })
  if (!parsed.success) {
    return { error: 'Invalid pagination parameters.' }
  }

  const { page: currentPage, limit: perPage } = parsed.data
  const offset = (currentPage - 1) * perPage

  const supabase = await createClient()

  // Get total count
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', auth.userId)

  if (countError) {
    console.error('Failed to count transactions:', countError.message)
    return { error: 'Failed to load transactions.' }
  }

  const total = count || 0
  const pages = Math.ceil(total / perPage)

  // Get paginated transactions with division name
  const { data: rows, error: fetchError } = await supabase
    .from('transactions')
    .select(
      'id, discount_code_id, employee_id, division_id, original_amount, discount_percentage, discount_amount, final_amount, location, validated_by, created_at, divisions(name)'
    )
    .eq('employee_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (fetchError) {
    console.error('Failed to fetch transactions:', fetchError.message)
    return { error: 'Failed to load transactions.' }
  }

  const transactions: Transaction[] = (rows || []).map((t) => {
    const div = t.divisions as unknown as { name: string } | null

    return {
      id: t.id,
      discount_code_id: t.discount_code_id,
      employee_id: t.employee_id,
      division_id: t.division_id,
      original_amount: Number(t.original_amount),
      discount_percentage: Number(t.discount_percentage),
      discount_amount: Number(t.discount_amount),
      final_amount: Number(t.final_amount),
      location: t.location,
      validated_by: t.validated_by,
      created_at: t.created_at,
      division_name: div?.name || undefined,
    }
  })

  return {
    transactions,
    total,
    page: currentPage,
    pages,
  }
}

// =============================================================================
// 6. Get Employee Profile Info
// =============================================================================

export async function getMyProfile(): Promise<
  | {
      profile: {
        id: string
        first_name: string | null
        last_name: string | null
        role: string
        is_active: boolean
        employee_id: string | null
        phone: string | null
        monthly_spending_limit: number | null
      }
      divisions: {
        id: string
        name: string
        code: string
        brands: { id: string; name: string; is_active: boolean }[]
      }[]
    }
  | { error: string }
> {
  const auth = await requireEmployee()
  if (isAuthError(auth)) return { error: auth.error }

  const supabase = await createClient()

  // Get divisions with brands via junction table
  const { data: assignments, error: assignError } = await supabase
    .from('employee_divisions')
    .select(
      'division_id, divisions(id, name, code, is_active, brands(id, name, is_active))'
    )
    .eq('employee_id', auth.userId)

  if (assignError) {
    console.error('Failed to fetch profile divisions:', assignError.message)
    return { error: 'Failed to load profile data.' }
  }

  const divisions: {
    id: string
    name: string
    code: string
    brands: { id: string; name: string; is_active: boolean }[]
  }[] = []

  for (const a of assignments || []) {
    const div = a.divisions as unknown as {
      id: string
      name: string
      code: string
      is_active: boolean
      brands: { id: string; name: string; is_active: boolean }[]
    } | null

    if (!div || !div.is_active) continue

    divisions.push({
      id: div.id,
      name: div.name,
      code: div.code,
      brands: (div.brands || []).filter((b) => b.is_active),
    })
  }

  return {
    profile: {
      id: auth.userId,
      first_name: auth.profile.first_name,
      last_name: auth.profile.last_name,
      role: auth.profile.role,
      is_active: auth.profile.is_active,
      employee_id: auth.profile.employee_id,
      phone: auth.profile.phone,
      monthly_spending_limit: auth.profile.monthly_spending_limit
        ? Number(auth.profile.monthly_spending_limit)
        : null,
    },
    divisions,
  }
}
