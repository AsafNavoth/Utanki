import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material'
import { useReactQuery } from '../hooks/useReactQuery'
import type { LrclibLyricsDetails } from '../types/lrclib'

type LyricsModalProps = {
  open: boolean
  lyricsId: number | null
  trackName: string
  artistName: string
  albumName: string
  onClose: () => void
}

export const LyricsModal = ({
  open,
  lyricsId,
  trackName,
  artistName,
  albumName,
  onClose,
}: LyricsModalProps) => {
  const { data, isLoading, error } = useReactQuery<LrclibLyricsDetails>({
    queryKey: ['lyrics', lyricsId],
    url: `/api/lyrics/${lyricsId}`,
    enabled: open && lyricsId !== null,
  })

  const lyricsToShow = data?.plainLyrics ?? data?.syncedLyrics ?? ''

  const dialogTitle = [trackName, artistName, albumName]
    .filter(Boolean)
    .join(' - ')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitle || 'Lyrics'}</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && (
          <Typography color="error">
            {error instanceof Error ? error.message : 'Failed to load lyrics'}
          </Typography>
        )}
        {data && !lyricsToShow && data.instrumental && (
          <Typography color="text.secondary">Instrumental track</Typography>
        )}
        {lyricsToShow && (
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}
          >
            {lyricsToShow}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}
