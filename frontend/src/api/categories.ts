import client from './client'
import type { Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get('/categories')
  return data
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await client.post('/categories', { name })
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await client.delete(`/categories/${id}`)
}
