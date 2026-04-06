import client from './client'
import type { Mapping } from '../types'

export async function getMappings(): Promise<Mapping[]> {
  const { data } = await client.get('/mappings')
  return data
}

export async function createMapping(keyword: string, category_id: number): Promise<Mapping> {
  const { data } = await client.post('/mappings', { keyword, category_id })
  return data
}

export async function deleteMapping(id: number): Promise<void> {
  await client.delete(`/mappings/${id}`)
}
