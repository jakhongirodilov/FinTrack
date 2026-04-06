import client from './client'
import type { Expense, ExpenseList, SummaryItem, MonthlyTotalItem } from '../types'

export async function getExpenses(params: {
  page?: number
  page_size?: number
  category_id?: number
  start_date?: string
  end_date?: string
}): Promise<ExpenseList> {
  const { data } = await client.get('/expenses', { params })
  return data
}

export async function createExpense(body: {
  amount: number
  category_id: number
  expense_date?: string
  note?: string
}): Promise<Expense> {
  const { data } = await client.post('/expenses', body)
  return data
}

export async function updateExpense(id: number, body: {
  amount?: number
  category_id?: number
  expense_date?: string
  note?: string
}): Promise<Expense> {
  const { data } = await client.patch(`/expenses/${id}`, body)
  return data
}

export async function deleteExpense(id: number): Promise<void> {
  await client.delete(`/expenses/${id}`)
}

export async function getSummary(startDate: string, endDate: string): Promise<SummaryItem[]> {
  const { data } = await client.get('/expenses/summary', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}

export async function getMonthlyTotals(months = 6): Promise<MonthlyTotalItem[]> {
  const { data } = await client.get('/expenses/monthly-totals', { params: { months } })
  return data
}
