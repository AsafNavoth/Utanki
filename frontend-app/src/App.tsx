import { Paper, Box, Container, styled, useMediaQuery, useTheme } from '@mui/material'
import { SearchView } from './components/search/SearchView'
import { AppBar } from './components/layout/AppBar'
import { FreeTextView } from './components/freeTextView/FreeTextView'
import { MobileMainView } from './components/layout/MobileMainView'

const AppLayout = styled(Box)({
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

const MainContainer = styled(Container)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(2),
  minHeight: 0,
}))

const MainPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}))

const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(2),
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  marginTop: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}))

export const App = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <AppLayout>
      <AppBar />
      <MainContainer maxWidth={false}>
        <MainPaper>
          {isMobile ? (
            <MobileMainView />
          ) : (
            <ContentBox>
              <SearchView />
              <FreeTextView />
            </ContentBox>
          )}
        </MainPaper>
      </MainContainer>
    </AppLayout>
  )
}
