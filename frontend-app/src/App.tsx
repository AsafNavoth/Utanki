import { Container, Paper, Typography, Box } from '@mui/material'
import { SearchView } from './components/SearchView'
import { PasteLyricsView } from './components/PasteLyricsView'

export const App = () => (
  <Container sx={{ height: '80vh', width: '80vw' }}>
    <Paper
      sx={{
        p: 2,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      component="div"
    >
      <Typography variant="h4" textAlign="center" sx={{ flexShrink: 0 }}>
        Utanki
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          mt: 2,
        }}
      >
        <SearchView />
        <PasteLyricsView />
      </Box>
    </Paper>
  </Container>
)
