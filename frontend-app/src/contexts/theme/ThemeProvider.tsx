import { useCallback, useMemo } from 'react'
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider as MuiThemeProvider,
  useMediaQuery,
} from '@mui/material'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import {
  ThemeContext,
  LIGHT_THEME_STRING,
  DARK_THEME_STRING,
} from './themeContext'
import type { ThemeMode } from './themeContext'

const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

const getIsMobileFromUserAgent = (): boolean =>
  typeof navigator !== 'undefined' && MOBILE_UA_REGEX.test(navigator.userAgent)

const THEME_MODE_STORAGE_KEY = 'utanki-theme-mode'

const FONT_FAMILY_HEADING =
  '"Montserrat", "Zen Kaku Gothic New", sans-serif'
const FONT_FAMILY_BODY = '"Inter", "Noto Sans JP", sans-serif'
const TYPOGRAPHY_HEADING_VARIANT_NAMES = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
] as const

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
    localStorageKey: THEME_MODE_STORAGE_KEY,
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
        typography: {
          fontFamily: FONT_FAMILY_BODY,
          ...Object.fromEntries(
            TYPOGRAPHY_HEADING_VARIANT_NAMES.map((variantName) => [
              variantName,
              { fontFamily: FONT_FAMILY_HEADING },
            ])
          ),
        },
        palette: {
          mode,
          primary: { main: '#14b8a6' },
          secondary: { main: '#38bdf8' },
          background:
            mode === LIGHT_THEME_STRING
              ? { default: '#eef2f6', paper: '#e2e8f0' }
              : { default: '#131A20', paper: '#2F3B46' },
        },
      }),
    [mode]
  )

  const isNarrowViewport = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobileUA = getIsMobileFromUserAgent()
  const isMobile = isNarrowViewport
  const isAnkiConnectSupported = !isMobileUA

  const contextValue = useMemo(
    () => ({ mode, toggleColorMode, isMobile, isAnkiConnectSupported }),
    [mode, toggleColorMode, isMobile, isAnkiConnectSupported]
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
