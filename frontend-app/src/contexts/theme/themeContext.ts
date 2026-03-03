import { createContext, useContext } from 'react'

export const LIGHT_THEME_STRING = 'light'
export const DARK_THEME_STRING = 'dark'

export type ThemeMode = typeof LIGHT_THEME_STRING | typeof DARK_THEME_STRING

export type ThemeContextValue = {
  mode: ThemeMode
  toggleColorMode: () => void
  isMobile: boolean
  isAnkiConnectSupported: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext)

  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }

  return ctx
}
