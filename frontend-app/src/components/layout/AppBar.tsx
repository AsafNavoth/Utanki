import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  styled,
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import {
  useThemeMode,
  LIGHT_THEME_STRING,
  DARK_THEME_STRING,
} from '../../contexts/theme/themeContext'
import { AnkiConnectBar } from '../anki/AnkiConnectBar'

const StyledAppBar = styled(MuiAppBar)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  minHeight: 56,
  [theme.breakpoints.up('sm')]: {
    minHeight: 64,
  },
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'nowrap',
  },
}))

const AppTitle = styled(Typography)(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
  },
}))

const ControlsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginLeft: 'auto',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'nowrap',
    minWidth: 0,
  },
}))

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5),
  },
}))

export const AppBar = () => {
  const { mode, toggleColorMode, isAnkiConnectSupported, isMobile } =
    useThemeMode()

  return (
    <StyledAppBar
      position={isMobile ? 'static' : 'fixed'}
      color="default"
      elevation={0}
    >
      <StyledToolbar>
        <AppTitle variant="h6">Utanki</AppTitle>
        <ControlsBox>
          {isAnkiConnectSupported && <AnkiConnectBar />}
          <StyledIconButton
            onClick={toggleColorMode}
            aria-label={`Switch to ${mode === LIGHT_THEME_STRING ? DARK_THEME_STRING : LIGHT_THEME_STRING} mode`}
            size="small"
          >
            {mode === LIGHT_THEME_STRING ? <DarkModeIcon /> : <LightModeIcon />}
          </StyledIconButton>
        </ControlsBox>
      </StyledToolbar>
    </StyledAppBar>
  )
}
