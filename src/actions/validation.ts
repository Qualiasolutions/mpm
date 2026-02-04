'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ValidationResult, CodeLookup, RecentValidation } from '@/types'

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Verifies the current user is authenticated and has admin role.
 * Cashiers are admins in this system.
 */
async function requireAdmin(): Promise<
  { userId: string } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  return { userId: user.id }
}

function isAuthError(
  result: { userId: string } | { error: string }
): result is { error: string } {
  return 'error' in result
}

// =============================================================================
// Validation Schemas
// =============================================================================

const ValidateCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  originalAmount: z.number().positive('Amount must be greater than zero'),
  location: z.string().optional(),
})

const LookupCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

const RecentValidationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

// =============================================================================
// 1. Validate and Redeem a Discount Code
// =============================================================================

/**
 * Validates a discount code (manual code or QR JSON payload) and redeems it.
 * Calls the DB function `validate_and_redeem_code` which handles all business
 * logic atomically: code status check, expiry, employee active status,
 * spending limit, and transaction creation.
 */
export async function validateCode(
  code: string,
  originalAmount: number,
  location?: string
): Promise<{ result: ValidationResult } | { error: string }> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: authResult.error }

  // Validate inputs
  const parsed = ValidateCodeSchema.safeParse({ code, originalAmount, location })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Determine the actual code to pass to the RPC.
  // If the input starts with '{', treat it as a QR JSON payload and extract the code.
  let codeToValidate: string

  const trimmedCode = parsed.data.code.trim()

  if (trimmedCode.startsWith('{')) {
    try {
      const qrPayload = JSON.parse(trimmedCode) as Record<string, unknown>

      // QR payloads contain code_id (UUID) or manual_code
      if (typeof qrPayload.manual_code === 'string' && qrPayload.manual_code.length > 0) {
        codeToValidate = qrPayload.manual_code
      } else if (typeof qrPayload.code_id === 'string' && qrPayload.code_id.length > 0) {
        codeToValidate = qrPayload.code_id
      } else {
        return { error: 'Invalid QR code payload. No code found.' }
      }
    } catch {
      return { error: 'Invalid QR code format. Could not parse payload.' }
    }
  } else {
    // Treat as manual code (e.g. MPM-XXXXXX)
    codeToValidate = trimmedCode.toUpperCase()
  }

  const supabase = await createClient()

  const { data, error: rpcError } = await supabase.rpc('validate_and_redeem_code', {
    p_code: codeToValidate,
    p_original_amount: parsed.data.originalAmount,
    p_location: parsed.data.location || null,
    p_validated_by: authResult.userId,
  })

  if (rpcError) {
    console.error('Validation RPC failed:', rpcError.message)
    return { error: 'Validation failed. Please try again.' }
  }

  // The RPC returns JSONB directly
  const result = data as ValidationResult

  if (!result) {
    return { error: 'Validation returned no result. Please try again.' }
  }

  return { result }
}

// =============================================================================
// 2. Look Up a Code Without Redeeming (Preview)
// =============================================================================

/**
 * Looks up a discount code to preview its details without redeeming it.
 * Useful for cashiers to verify the code before processing.
 */
export async function lookupCode(
  code: string
): Promise<{ code: CodeLookup } | { error: string }> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: authResult.error }

  const parsed = LookupCodeSchema.safeParse({ code })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const trimmedCode = parsed.data.code.trim()

  // Extract the code value if QR payload
  let lookupValue: string
  let isUuid = false

  if (trimmedCode.startsWith('{')) {
    try {
      const qrPayload = JSON.parse(trimmedCode) as Record<string, unknown>

      if (typeof qrPayload.manual_code === 'string' && qrPayload.manual_code.length > 0) {
        lookupValue = qrPayload.manual_code
      } else if (typeof qrPayload.code_id === 'string' && qrPayload.code_id.length > 0) {
        lookupValue = qrPayload.code_id
        isUuid = true
      } else {
        return { error: 'Invalid QR code payload.' }
      }
    } catch {
      return { error: 'Invalid QR code format.' }
    }
  } else {
    lookupValue = trimmedCode.toUpperCase()
    // Check if it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    isUuid = uuidRegex.test(lookupValue)
  }

  const supabase = await createClient()

  // Query by either UUID (id) or manual_code
  let query = supabase
    .from('discount_codes')
    .select(
      'id, manual_code, status, discount_percentage, expires_at, created_at, employee_id, profiles!discount_codes_employee_id_fkey(first_name, last_name), divisions(name)'
    )

  if (isUuid) {
    query = query.eq('id', lookupValue)
  } else {
    query = query.eq('manual_code', lookupValue)
  }

  const { data: codeRow, error: fetchError } = await query.maybeSingle()

  if (fetchError) {
    console.error('Code lookup failed:', fetchError.message)
    return { error: 'Failed to look up code.' }
  }

  if (!codeRow) {
    return { error: 'Code not found.' }
  }

  const profile = codeRow.profiles as unknown as {
    first_name: string | null
    last_name: string | null
  } | null

  const division = codeRow.divisions as unknown as {
    name: string
  } | null

  const employeeName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
    : 'Unknown'

  return {
    code: {
      id: codeRow.id as string,
      manual_code: codeRow.manual_code as string,
      status: codeRow.status as string,
      employee_name: employeeName,
      division_name: division?.name || 'Unknown',
      discount_percentage: Number(codeRow.discount_percentage),
      expires_at: codeRow.expires_at as string,
      created_at: codeRow.created_at as string,
    },
  }
}

// =============================================================================
// 3. Get Recent Validations for the Current Session
// =============================================================================

/**
 * Returns recent transactions validated by the current admin/cashier,
 * ordered by most recent first.
 */
export async function getRecentValidations(
  limit?: number
): Promise<{ validations: RecentValidation[] } | { error: string }> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: authResult.error }

  const parsed = RecentValidationsSchema.safeParse({ limit: limit ?? 10 })
  if (!parsed.success) {
    return { error: 'Invalid limit parameter.' }
  }

  const supabase = await createClient()

  const { data: rows, error: fetchError } = await supabase
    .from('transactions')
    .select(
      'id, original_amount, discount_amount, final_amount, discount_percentage, created_at, employee_id, profiles!transactions_employee_id_fkey(first_name, last_name), divisions(name)'
    )
    .eq('validated_by', authResult.userId)
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit)

  if (fetchError) {
    console.error('Failed to fetch recent validations:', fetchError.message)
    return { error: 'Failed to load recent validations.' }
  }

  const validations: RecentValidation[] = (rows || []).map((t) => {
    const profile = t.profiles as unknown as {
      first_name: string | null
      last_name: string | null
    } | null

    const division = t.divisions as unknown as {
      name: string
    } | null

    const employeeName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
      : 'Unknown'

    return {
      id: t.id as string,
      employee_name: employeeName,
      division_name: division?.name || 'Unknown',
      original_amount: Number(t.original_amount),
      discount_amount: Number(t.discount_amount),
      final_amount: Number(t.final_amount),
      discount_percentage: Number(t.discount_percentage),
      created_at: t.created_at as string,
    }
  })

  return { validations }
}
