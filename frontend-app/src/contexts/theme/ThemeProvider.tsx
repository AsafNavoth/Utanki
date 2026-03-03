import { useCallback, useMemo } from 'react'
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { ThemeContext } from './themeContext'
import type { ThemeMode } from './themeContext'

const STORAGE_KEY = 'utanki-theme-mode'
const LIGHT_THEME_STRING = 'light'
const DARK_THEME_STRING = 'dark'

const getThemeModeFromString = (inputString: string): ThemeMode | null => {
  switch (inputString) {
    case LIGHT_THEME_STRING:
    case DARK_THEME_STRING:
      return inputString
    default:
      return null
  }
}

type ThemeProviderProps = {
  children: React.ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useLocalStorageState<ThemeMode>({
    key: STORAGE_KEY,
    defaultValue: LIGHT_THEME_STRING,
    parse: getThemeModeFromString,
  })

  const toggleColorMode = useCallback(() => {
    setMode((prev) =>
      prev === LIGHT_THEME_STRING ? DARK_THEME_STRING : LIGHT_THEME_STRING
    )
  }, [setMode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#14b8a6' },
          secondary: { main: '#38bdf8' },
          background:
            mode === 'light'
              ? { default: '#eef2f6', paper: '#e2e8f0' }
              : { default: '#131A20', paper: '#2F3B46' },
        },
      }),
    [mode]
  )

  const contextValue = useMemo(
    () => ({ mode, toggleColorMode }),
    [mode, toggleColorMode]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            '@media (max-width: 600px)': {
              html: { fontSize: '22px' },
            },
          }}
        />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
