import client from './client'
import type { TelegramAuthPayload, User } from '../types'

export async function postTelegramAuth(payload: TelegramAuthPayload): Promise<{ token: string; user: User }> {
  const { data: tokenData } = await client.post('/auth/telegram', payload)
  // Fetch user profile with the new token
  const { data: user } = await client.get('/users/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  return { token: tokenData.access_token, user }
}
