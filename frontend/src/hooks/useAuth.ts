import { useState } from 'react'
import type { User } from '../types'

const TOKEN_KEY = 'fintrack_jwt'
const USER_KEY = 'fintrack_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })

  function login(token: string, userObj: User) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userObj))
    setUser(userObj)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  function updateUser(userObj: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(userObj))
    setUser(userObj)
  }

  return { user, login, logout, updateUser }
}
