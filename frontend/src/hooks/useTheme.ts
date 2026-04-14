import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

function getInitial(): Theme {
  try {
    const stored = localStorage.getItem('fintrack_theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('fintrack_theme', theme) } catch {}
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return { theme, toggle }
}
