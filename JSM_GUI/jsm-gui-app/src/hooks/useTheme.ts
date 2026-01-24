import { useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'jsm-theme'

const getSystemPref = (): Theme | null => {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null)
    const initial = (document.documentElement.dataset.theme as Theme | undefined) ?? stored ?? getSystemPref() ?? 'dark'
    apply(initial, false)

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const next = event.newValue as Theme
        setTheme(next)
        document.documentElement.dataset.theme = next
      }
    }

    const onCustom = (event: Event) => {
      const next = (event as CustomEvent<Theme>).detail
      if (next) {
        setTheme(next)
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('jsm-theme-changed', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('jsm-theme-changed', onCustom as EventListener)
    }
  }, [])

  const apply = useCallback((next: Theme, broadcast = true) => {
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.dataset.theme = next
    if (broadcast && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<Theme>('jsm-theme-changed', { detail: next }))
    }
  }, [])

  const toggle = useCallback(() => {
    apply(theme === 'dark' ? 'light' : 'dark')
  }, [apply, theme])

  return { theme, setTheme: apply, toggle }
}
