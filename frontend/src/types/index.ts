export interface User {
  id: number
  first_name: string | null
  last_name: string | null
  username: string
  budget: number | null
}

export interface Category {
  id: number
  name: string
}

export interface Mapping {
  id: number
  keyword: string
  category_id: number
  category_name: string
}

export interface Expense {
  id: number
  amount: number
  expense_date: string
  category_id: number | null
  category_name: string | null
  note: string | null
  import_ref: string | null
}

export interface ExpenseList {
  items: Expense[]
  total: number
}

export interface SummaryItem {
  category_name: string
  total: number
}

export interface MonthlyTotalItem {
  month: string
  total: number
}

export interface TelegramAuthPayload {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}
