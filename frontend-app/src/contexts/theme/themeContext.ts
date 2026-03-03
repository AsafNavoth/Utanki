import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark'

export type ThemeContextValue = {
  mode: ThemeMode
  toggleColorMode: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext)

  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }

  return ctx
}
