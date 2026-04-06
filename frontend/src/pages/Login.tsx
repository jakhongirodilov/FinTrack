import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { postTelegramAuth } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import type { TelegramAuthPayload } from '../types'

const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || ''

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramAuthPayload) => void
  }
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.onTelegramAuth = async (payload) => {
      try {
        const { token, user } = await postTelegramAuth(payload)
        login(token, user)
        navigate('/')
      } catch (e: any) {
        const msg = e?.response?.data?.detail || 'Login failed'
        alert(msg)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_NAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    containerRef.current?.appendChild(script)

    return () => {
      containerRef.current?.removeChild(script)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>FinTrack</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Sign in with your Telegram account</p>
        <div ref={containerRef} />
        {!BOT_NAME && (
          <p style={{ color: '#c00', fontSize: '0.85rem', marginTop: '1rem' }}>
            VITE_TELEGRAM_BOT_NAME is not set
          </p>
        )}
      </div>
    </div>
  )
}
