'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Employee,
  Division,
  DiscountRule,
  AdminStats,
  ImportResult,
} from '@/types'

// =============================================================================
// Shared Types & Helpers
// =============================================================================

export type ActionState = {
  error?: string
  success?: boolean
  message?: string
} | null

/**
 * Verifies the current user is authenticated and has admin role.
 * Returns the user ID on success, or an error ActionState.
 */
async function requireAdmin(): Promise<
  { userId: string } | { error: ActionState }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: { error: 'Unauthorized' } }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: { error: 'Unauthorized' } }
  }

  return { userId: user.id }
}

function isAuthError(
  result: { userId: string } | { error: ActionState }
): result is { error: ActionState } {
  return 'error' in result
}

// =============================================================================
// Validation Schemas
// =============================================================================

const CreateEmployeeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['employee', 'admin']).default('employee'),
})

const UpdateEmployeeSchema = z.object({
  id: z.string().uuid('Invalid employee ID'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['employee', 'admin']),
  employeeId: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  monthlySpendingLimit: z.coerce
    .number()
    .min(0, 'Spending limit must be positive')
    .max(99999999, 'Spending limit too large')
    .optional(),
  divisionIds: z.string().optional().default(''),
})

const CreateDivisionSchema = z.object({
  name: z.string().min(1, 'Division name is required'),
  code: z
    .string()
    .min(1, 'Division code is required')
    .max(20, 'Code must be 20 characters or less'),
  description: z.string().optional().default(''),
})

const UpdateDivisionSchema = z.object({
  id: z.string().uuid('Invalid division ID'),
  name: z.string().min(1, 'Division name is required'),
  code: z
    .string()
    .min(1, 'Division code is required')
    .max(20, 'Code must be 20 characters or less'),
  description: z.string().optional().default(''),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .or(z.boolean()),
})

const CreateBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  divisionId: z.string().uuid('Invalid division ID'),
})

const UpdateBrandSchema = z.object({
  id: z.string().uuid('Invalid brand ID'),
  name: z.string().min(1, 'Brand name is required'),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .or(z.boolean()),
})

const UpdateDiscountRuleSchema = z.object({
  id: z.string().uuid('Invalid discount rule ID'),
  discountPercentage: z.coerce
    .number()
    .min(0, 'Discount must be 0% or more')
    .max(100, 'Discount cannot exceed 100%'),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .or(z.boolean()),
})

const UpdateDefaultSpendingLimitSchema = z.object({
  limit: z.coerce
    .number()
    .min(0, 'Limit must be positive')
    .max(99999999, 'Limit too large'),
})

// =============================================================================
// Employee Management
// =============================================================================

export type CreateEmployeeState = ActionState

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

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

  if (role === 'admin' && createData.user) {
    const { error: roleError } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', createData.user.id)

    if (roleError) {
      console.error('Failed to set admin role:', roleError.message)
    }
  }

  if (createData.user) {
    const { error: linkError } = await adminClient.auth.admin.generateLink({
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
    }
  }

  return {
    success: true,
    message: 'Employee created. They will receive an email to set their password.',
  }
}

export async function getEmployees(): Promise<
  { employees: Employee[] } | { error: string }
> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, role, first_name, last_name, is_active, employee_id, phone, monthly_spending_limit, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (profilesError) {
    console.error('Failed to fetch employees:', profilesError.message)
    return { error: 'Failed to load employees.' }
  }

  // Fetch all employee-division assignments with division info
  const { data: assignments, error: assignmentsError } = await adminClient
    .from('employee_divisions')
    .select('employee_id, division_id, divisions(id, name, code)')

  if (assignmentsError) {
    console.error('Failed to fetch assignments:', assignmentsError.message)
    return { error: 'Failed to load employee data.' }
  }

  // Fetch auth users to get emails
  const { data: authData, error: authError } =
    await adminClient.auth.admin.listUsers({ perPage: 1000 })

  if (authError) {
    console.error('Failed to fetch auth users:', authError.message)
    return { error: 'Failed to load employee data.' }
  }

  const emailMap = new Map<string, string>()
  for (const u of authData.users) {
    emailMap.set(u.id, u.email || '')
  }

  // Build assignment map: employee_id -> divisions[]
  const divisionMap = new Map<
    string,
    { id: string; name: string; code: string }[]
  >()
  for (const a of assignments || []) {
    const empId = a.employee_id as string
    const div = a.divisions as unknown as {
      id: string
      name: string
      code: string
    } | null
    if (!div) continue
    if (!divisionMap.has(empId)) {
      divisionMap.set(empId, [])
    }
    divisionMap.get(empId)!.push({
      id: div.id,
      name: div.name,
      code: div.code,
    })
  }

  const employees: Employee[] = (profiles || []).map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) || '',
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role as 'admin' | 'employee',
    is_active: p.is_active,
    employee_id: p.employee_id,
    phone: p.phone,
    monthly_spending_limit: p.monthly_spending_limit
      ? Number(p.monthly_spending_limit)
      : null,
    created_at: p.created_at,
    updated_at: p.updated_at,
    divisions: divisionMap.get(p.id) || [],
  }))

  return { employees }
}

export async function updateEmployee(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    id: formData.get('id'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: formData.get('role'),
    employeeId: formData.get('employeeId') || '',
    phone: formData.get('phone') || '',
    monthlySpendingLimit: formData.get('monthlySpendingLimit'),
    divisionIds: formData.get('divisionIds') || '',
  }

  const parsed = UpdateEmployeeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const {
    id,
    firstName,
    lastName,
    role,
    employeeId,
    phone,
    monthlySpendingLimit,
    divisionIds,
  } = parsed.data

  const adminClient = createAdminClient()

  // 1. Update profile fields
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      role,
      employee_id: employeeId || null,
      phone: phone || null,
      monthly_spending_limit: monthlySpendingLimit ?? null,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update employee:', updateError.message)
    return { error: 'Failed to update employee.' }
  }

  // 2. Delete existing division assignments
  const { error: deleteError } = await adminClient
    .from('employee_divisions')
    .delete()
    .eq('employee_id', id)

  if (deleteError) {
    console.error('Failed to clear division assignments:', deleteError.message)
    return { error: 'Failed to update division assignments.' }
  }

  // 3. Insert new division assignments
  const divIds = divisionIds
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (divIds.length > 0) {
    const rows = divIds.map((divId) => ({
      employee_id: id,
      division_id: divId,
    }))

    const { error: insertError } = await adminClient
      .from('employee_divisions')
      .insert(rows)

    if (insertError) {
      console.error('Failed to assign divisions:', insertError.message)
      return { error: 'Employee updated but division assignment failed.' }
    }
  }

  return { success: true, message: 'Employee updated successfully.' }
}

export async function toggleEmployeeStatus(
  employeeId: string
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const idSchema = z.string().uuid('Invalid employee ID')
  const idResult = idSchema.safeParse(employeeId)
  if (!idResult.success) {
    return { error: 'Invalid employee ID.' }
  }

  const adminClient = createAdminClient()

  // Get current status
  const { data: profile, error: fetchError } = await adminClient
    .from('profiles')
    .select('is_active')
    .eq('id', employeeId)
    .single()

  if (fetchError || !profile) {
    console.error('Failed to fetch employee:', fetchError?.message)
    return { error: 'Employee not found.' }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ is_active: !profile.is_active })
    .eq('id', employeeId)

  if (updateError) {
    console.error('Failed to toggle status:', updateError.message)
    return { error: 'Failed to update employee status.' }
  }

  return {
    success: true,
    message: profile.is_active
      ? 'Employee deactivated.'
      : 'Employee activated.',
  }
}

// =============================================================================
// Division Management
// =============================================================================

export async function getDivisions(): Promise<
  { divisions: Division[] } | { error: string }
> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: divisions, error: divError } = await adminClient
    .from('divisions')
    .select(
      'id, name, code, description, is_active, created_at, updated_at, brands(id, name, division_id, is_active), discount_rules(id, division_id, discount_percentage, is_active)'
    )
    .order('name', { ascending: true })

  if (divError) {
    console.error('Failed to fetch divisions:', divError.message)
    return { error: 'Failed to load divisions.' }
  }

  const result: Division[] = (divisions || []).map((d) => {
    // discount_rules is 1:1 via UNIQUE constraint, but Supabase returns array
    const rules = d.discount_rules as unknown as DiscountRule[] | null
    const rule = rules && rules.length > 0 ? rules[0] : null

    return {
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      is_active: d.is_active,
      created_at: d.created_at,
      updated_at: d.updated_at,
      brands: (d.brands || []) as {
        id: string
        name: string
        division_id: string
        is_active: boolean
      }[],
      discount_rule: rule
        ? {
            id: rule.id,
            division_id: rule.division_id,
            discount_percentage: Number(rule.discount_percentage),
            is_active: rule.is_active,
          }
        : null,
    }
  })

  return { divisions: result }
}

export async function createDivision(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description') || '',
  }

  const parsed = CreateDivisionSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, code, description } = parsed.data
  const adminClient = createAdminClient()

  // Create division
  const { data: division, error: divError } = await adminClient
    .from('divisions')
    .insert({
      name,
      code: code.toUpperCase(),
      description: description || null,
    })
    .select('id')
    .single()

  if (divError) {
    console.error('Failed to create division:', divError.message)
    if (divError.code === '23505') {
      return { error: 'A division with that name or code already exists.' }
    }
    return { error: 'Failed to create division.' }
  }

  // Create default discount rule at 0%
  const { error: ruleError } = await adminClient
    .from('discount_rules')
    .insert({
      division_id: division.id,
      discount_percentage: 0,
      is_active: true,
    })

  if (ruleError) {
    console.error('Failed to create default discount rule:', ruleError.message)
    // Division was created, rule can be added later
  }

  return { success: true, message: 'Division created successfully.' }
}

export async function updateDivision(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description') || '',
    isActive: formData.get('isActive') ?? 'true',
  }

  const parsed = UpdateDivisionSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { id, name, code, description, isActive } = parsed.data
  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from('divisions')
    .update({
      name,
      code: code.toUpperCase(),
      description: description || null,
      is_active: isActive,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update division:', updateError.message)
    if (updateError.code === '23505') {
      return { error: 'A division with that name or code already exists.' }
    }
    return { error: 'Failed to update division.' }
  }

  return { success: true, message: 'Division updated successfully.' }
}

export async function deleteDivision(
  divisionId: string
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const idSchema = z.string().uuid('Invalid division ID')
  const idResult = idSchema.safeParse(divisionId)
  if (!idResult.success) {
    return { error: 'Invalid division ID.' }
  }

  const adminClient = createAdminClient()

  // Check if any active employees are assigned
  const { count, error: countError } = await adminClient
    .from('employee_divisions')
    .select('employee_id', { count: 'exact', head: true })
    .eq('division_id', divisionId)

  if (countError) {
    console.error('Failed to check division usage:', countError.message)
    return { error: 'Failed to check division usage.' }
  }

  if (count && count > 0) {
    return {
      error: `Cannot deactivate division. ${count} employee(s) are still assigned to it.`,
    }
  }

  // Soft delete: set is_active = false
  const { error: updateError } = await adminClient
    .from('divisions')
    .update({ is_active: false })
    .eq('id', divisionId)

  if (updateError) {
    console.error('Failed to deactivate division:', updateError.message)
    return { error: 'Failed to deactivate division.' }
  }

  return { success: true, message: 'Division deactivated.' }
}

// =============================================================================
// Brand Management
// =============================================================================

export async function createBrand(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    name: formData.get('name'),
    divisionId: formData.get('divisionId'),
  }

  const parsed = CreateBrandSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, divisionId } = parsed.data
  const adminClient = createAdminClient()

  const { error: insertError } = await adminClient
    .from('brands')
    .insert({ name, division_id: divisionId })

  if (insertError) {
    console.error('Failed to create brand:', insertError.message)
    if (insertError.code === '23505') {
      return { error: 'A brand with that name already exists in this division.' }
    }
    return { error: 'Failed to create brand.' }
  }

  return { success: true, message: 'Brand created successfully.' }
}

export async function updateBrand(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    isActive: formData.get('isActive') ?? 'true',
  }

  const parsed = UpdateBrandSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { id, name, isActive } = parsed.data
  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from('brands')
    .update({ name, is_active: isActive })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update brand:', updateError.message)
    if (updateError.code === '23505') {
      return { error: 'A brand with that name already exists in this division.' }
    }
    return { error: 'Failed to update brand.' }
  }

  return { success: true, message: 'Brand updated successfully.' }
}

export async function deleteBrand(brandId: string): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const idSchema = z.string().uuid('Invalid brand ID')
  const idResult = idSchema.safeParse(brandId)
  if (!idResult.success) {
    return { error: 'Invalid brand ID.' }
  }

  const adminClient = createAdminClient()

  const { error: deleteError } = await adminClient
    .from('brands')
    .delete()
    .eq('id', brandId)

  if (deleteError) {
    console.error('Failed to delete brand:', deleteError.message)
    return { error: 'Failed to delete brand.' }
  }

  return { success: true, message: 'Brand deleted.' }
}

// =============================================================================
// Discount Rules
// =============================================================================

export async function updateDiscountRule(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    id: formData.get('id'),
    discountPercentage: formData.get('discountPercentage'),
    isActive: formData.get('isActive') ?? 'true',
  }

  const parsed = UpdateDiscountRuleSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { id, discountPercentage, isActive } = parsed.data
  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from('discount_rules')
    .update({
      discount_percentage: discountPercentage,
      is_active: isActive,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update discount rule:', updateError.message)
    return { error: 'Failed to update discount rule.' }
  }

  return { success: true, message: 'Discount rule updated.' }
}

export async function getDiscountRules(): Promise<
  { rules: (DiscountRule & { division_name: string; division_code: string })[] } | { error: string }
> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: rules, error: rulesError } = await adminClient
    .from('discount_rules')
    .select(
      'id, division_id, discount_percentage, is_active, divisions(name, code)'
    )
    .order('created_at', { ascending: true })

  if (rulesError) {
    console.error('Failed to fetch discount rules:', rulesError.message)
    return { error: 'Failed to load discount rules.' }
  }

  const result = (rules || []).map((r) => {
    const div = r.divisions as unknown as {
      name: string
      code: string
    } | null

    return {
      id: r.id as string,
      division_id: r.division_id as string,
      discount_percentage: Number(r.discount_percentage),
      is_active: r.is_active as boolean,
      division_name: div?.name || '',
      division_code: div?.code || '',
    }
  })

  return { rules: result }
}

export async function updateDefaultSpendingLimit(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  const raw = {
    limit: formData.get('limit'),
  }

  const parsed = UpdateDefaultSpendingLimitSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { limit } = parsed.data
  const adminClient = createAdminClient()

  const { error: upsertError } = await adminClient
    .from('app_settings')
    .upsert(
      {
        key: 'default_monthly_spending_limit',
        value: limit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (upsertError) {
    console.error('Failed to update spending limit:', upsertError.message)
    return { error: 'Failed to update default spending limit.' }
  }

  return { success: true, message: `Default spending limit set to ${limit}.` }
}

// =============================================================================
// CSV Import
// =============================================================================

/**
 * Parses a CSV string, handling quoted fields with commas and newlines.
 * Returns an array of string arrays (rows x columns).
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote
        current += '"'
        i++ // skip next quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(current.trim())
        current = ''
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current.trim())
        current = ''
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row)
        }
        row = []
        if (char === '\r') i++ // skip \n after \r
      } else {
        current += char
      }
    }
  }

  // Handle last row (no trailing newline)
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row)
    }
  }

  return rows
}

export async function importEmployeesCSV(
  _prevState: ActionState & { result?: ImportResult },
  formData: FormData
): Promise<ActionState & { result?: ImportResult }> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult))
    return authResult.error as ActionState & { result?: ImportResult }

  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File)) {
    return { error: 'No CSV file provided.' }
  }

  // Validate file type
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return { error: 'Please upload a CSV file.' }
  }

  // Limit file size to 2MB
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 2MB.' }
  }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length < 2) {
    return { error: 'CSV must contain a header row and at least one data row.' }
  }

  // Parse header
  const header = rows[0].map((h) => h.toLowerCase().trim())
  const firstNameIdx = header.indexOf('first_name')
  const lastNameIdx = header.indexOf('last_name')
  const emailIdx = header.indexOf('email')
  const roleIdx = header.indexOf('role')
  const divisionsIdx = header.indexOf('divisions')

  if (emailIdx === -1) {
    return { error: 'CSV must contain an "email" column.' }
  }
  if (firstNameIdx === -1) {
    return { error: 'CSV must contain a "first_name" column.' }
  }
  if (lastNameIdx === -1) {
    return { error: 'CSV must contain a "last_name" column.' }
  }

  const adminClient = createAdminClient()

  // Pre-fetch divisions for matching by code
  const { data: allDivisions } = await adminClient
    .from('divisions')
    .select('id, code, name')
    .eq('is_active', true)

  const divisionCodeMap = new Map<string, string>()
  for (const d of allDivisions || []) {
    divisionCodeMap.set(d.code.toUpperCase(), d.id)
    divisionCodeMap.set(d.name.toUpperCase(), d.id)
  }

  const dataRows = rows.slice(1)
  let imported = 0
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2 // 1-indexed, accounting for header
    const cells = dataRows[i]

    const email = cells[emailIdx]?.trim()
    const firstName = cells[firstNameIdx]?.trim()
    const lastName = cells[lastNameIdx]?.trim()
    const role =
      roleIdx !== -1 ? cells[roleIdx]?.trim().toLowerCase() : 'employee'
    const divisionsStr = divisionsIdx !== -1 ? cells[divisionsIdx]?.trim() : ''

    // Validate email
    const emailCheck = z.string().email().safeParse(email)
    if (!emailCheck.success) {
      skipped.push({ row: rowNum, reason: `Invalid email: ${email || '(empty)'}` })
      continue
    }

    if (!firstName) {
      skipped.push({ row: rowNum, reason: 'Missing first name' })
      continue
    }

    if (!lastName) {
      skipped.push({ row: rowNum, reason: 'Missing last name' })
      continue
    }

    const validRole = role === 'admin' ? 'admin' : 'employee'

    // 1. Create auth user
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
      skipped.push({
        row: rowNum,
        reason: `Failed to create user (email may already exist)`,
      })
      continue
    }

    const userId = createData.user.id

    // 2. Update profile if role is admin
    if (validRole === 'admin') {
      const { error: roleError } = await adminClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)

      if (roleError) {
        console.error(`CSV import: failed to set admin role for row ${rowNum}:`, roleError.message)
      }
    }

    // 3. Assign divisions
    if (divisionsStr) {
      const divCodes = divisionsStr
        .split(';')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0)

      const divRows: { employee_id: string; division_id: string }[] = []
      for (const code of divCodes) {
        const divId = divisionCodeMap.get(code)
        if (divId) {
          divRows.push({ employee_id: userId, division_id: divId })
        }
      }

      if (divRows.length > 0) {
        const { error: assignError } = await adminClient
          .from('employee_divisions')
          .insert(divRows)

        if (assignError) {
          console.error(
            `CSV import: failed to assign divisions for row ${rowNum}:`,
            assignError.message
          )
        }
      }
    }

    // 4. Generate magic link for password setup
    await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo:
          (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') +
          '/auth/callback?next=/update-password',
      },
    })

    imported++
  }

  return {
    success: true,
    message: `Imported ${imported} of ${dataRows.length} employees.`,
    result: {
      imported,
      skipped,
      total: dataRows.length,
    },
  }
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export async function getAdminStats(): Promise<
  { stats: AdminStats } | { error: string }
> {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Run all count queries in parallel
  const [
    totalEmployeesResult,
    activeEmployeesResult,
    totalDivisionsResult,
    activeRulesResult,
  ] = await Promise.all([
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    adminClient
      .from('divisions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    adminClient
      .from('discount_rules')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  if (
    totalEmployeesResult.error ||
    activeEmployeesResult.error ||
    totalDivisionsResult.error ||
    activeRulesResult.error
  ) {
    console.error('Failed to fetch admin stats')
    return { error: 'Failed to load dashboard statistics.' }
  }

  return {
    stats: {
      totalEmployees: totalEmployeesResult.count || 0,
      activeEmployees: activeEmployeesResult.count || 0,
      totalDivisions: totalDivisionsResult.count || 0,
      activeDiscountRules: activeRulesResult.count || 0,
    },
  }
}
