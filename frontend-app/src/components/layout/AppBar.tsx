import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeMode } from '../../contexts/theme/themeContext'
import { getFlexRowWrapStyle } from '../../utils/commonStyles'
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
}))

export const AppBar = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { mode, toggleColorMode } = useThemeMode()

  return (
    <StyledAppBar position="fixed" color="default" elevation={0}>
      <StyledToolbar>
        <Typography variant="h6" component="h1">
          Utanki
        </Typography>
        <Box sx={(theme) => getFlexRowWrapStyle({ theme })}>
          {!isMobile && <AnkiConnectBar />}
          <IconButton
            onClick={toggleColorMode}
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            size="small"
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Box>
      </StyledToolbar>
    </StyledAppBar>
  )
}
