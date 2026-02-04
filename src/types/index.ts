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
