import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { postTelegramAuth } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
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
  useTheme() // apply theme to <html> even outside Layout

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
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    containerRef.current?.appendChild(script)

    return () => {
      if (containerRef.current?.contains(script)) {
        containerRef.current.removeChild(script)
      }
    }
  }, [])

  return (
    <div style={page}>
      <div style={card}>
        <div style={logoWrap}>
          <div style={logoMark}>₸</div>
        </div>
        <h1 style={title}>FinTrack</h1>
        <p style={subtitle}>Sign in with Telegram to continue</p>

        <div style={{ margin: '1.75rem 0 0', minHeight: 48, display: 'flex', justifyContent: 'center' }}>
          <div ref={containerRef} />
        </div>

        {!BOT_NAME && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
            VITE_TELEGRAM_BOT_NAME is not configured
          </p>
        )}

        <p style={hint}>
          You need to message the bot first to create an account.
        </p>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '1rem',
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  padding: '2.5rem 2rem',
  width: '100%',
  maxWidth: 360,
  boxShadow: 'var(--shadow-md)',
  textAlign: 'center',
  border: '1px solid var(--border)',
}

const logoWrap: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '1rem',
}

const logoMark: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background: 'var(--primary)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  fontWeight: 700,
  boxShadow: '0 4px 14px var(--primary-ring)',
}

const title: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '0.375rem',
}

const subtitle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '0.9rem',
  margin: 0,
}

const hint: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '0.75rem',
  marginTop: '1.25rem',
  marginBottom: 0,
}
