export type Employee = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'employee'
  is_active: boolean
  employee_id: string | null
  phone: string | null
  monthly_spending_limit: number | null
  created_at: string
  updated_at: string
  divisions: { id: string; name: string; code: string }[]
}

export type Division = {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  brands: Brand[]
  discount_rule: DiscountRule | null
}

export type Brand = {
  id: string
  name: string
  division_id: string
  is_active: boolean
}

export type DiscountRule = {
  id: string
  division_id: string
  discount_percentage: number
  is_active: boolean
}

export type AdminStats = {
  totalEmployees: number
  activeEmployees: number
  totalDivisions: number
  activeDiscountRules: number
}

export type ImportResult = {
  imported: number
  skipped: { row: number; reason: string }[]
  total: number
}

export type ActionState = {
  error?: string
  success?: boolean
  message?: string
} | null

export type ImportActionState = {
  error?: string
  success?: boolean
  message?: string
  result?: ImportResult
} | null

export type DiscountCode = {
  id: string
  employee_id: string
  division_id: string
  discount_percentage: number
  manual_code: string
  qr_payload: string
  status: 'active' | 'used' | 'expired'
  expires_at: string
  created_at: string
  division_name?: string
}

export type Transaction = {
  id: string
  discount_code_id: string
  employee_id: string
  division_id: string
  original_amount: number
  discount_percentage: number
  discount_amount: number
  final_amount: number
  location: string | null
  validated_by: string | null
  created_at: string
  division_name?: string
}

export type SpendingSummary = {
  limit: number
  spent: number
  remaining: number
  percentage: number
}

export type EmployeeDiscount = {
  division: { id: string; name: string; code: string }
  discount_percentage: number
  brand_count: number
}

export type ValidationResult = {
  success: boolean
  error?: string
  message?: string
  transaction_id?: string
  employee_name?: string
  division_name?: string
  division_code?: string
  discount_percentage?: number
  original_amount?: number
  discount_amount?: number
  final_amount?: number
  remaining_limit?: number
  details?: {
    limit?: number
    spent?: number
    remaining?: number
    requested?: number
  }
}

export type CodeLookup = {
  id: string
  manual_code: string
  status: string
  employee_name: string
  division_name: string
  discount_percentage: number
  expires_at: string
  created_at: string
}

export type RecentValidation = {
  id: string
  employee_name: string
  division_name: string
  original_amount: number
  discount_amount: number
  final_amount: number
  discount_percentage: number
  created_at: string
}
