'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

export const LUMI_THEME_KEY = 'lumi_theme'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDomTheme(next: Theme) {
  document.documentElement.classList.toggle('dark', next === 'dark')
  localStorage.setItem(LUMI_THEME_KEY, next)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(LUMI_THEME_KEY)
    const initial: Theme = stored === 'dark' || stored === 'light' ? stored : 'light'
    setThemeState(initial)
    applyDomTheme(initial)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyDomTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      applyDomTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
