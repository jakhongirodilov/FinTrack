import client from './client'
import type { User } from '../types'

export async function getMe(): Promise<User> {
  const { data } = await client.get('/users/me')
  return data
}

export async function updateBudget(budget: number | null): Promise<User> {
  const { data } = await client.put('/users/me', { budget })
  return data
}
