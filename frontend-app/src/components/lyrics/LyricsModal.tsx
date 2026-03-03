import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  styled,
} from '@mui/material'
import { useReactQuery } from '../../hooks/useReactQuery'
import { useSnackbar } from '../../contexts/snackbar/snackbarContext'
import { useAnkiConnect } from '../../hooks/useAnkiConnect'
import { useAnkiExport } from '../../hooks/useAnkiExport'
import { useAnkiNotes } from '../../hooks/useAnkiNotes'
import type { LrclibLyricsDetails } from '../../types/lrclib'
import { DeckNameDialog } from '../anki/DeckNameDialog'
import { LyricsSkeleton } from '../common/LoadingSkeletons'
import { AnkiExportButton } from '../anki/AnkiExportButton'
import { NotesChecklistModal } from '../anki/NotesChecklistModal'
import { getFlexRowCenterStyle } from '../../utils/commonStyles'

type LyricsModalProps = {
  open: boolean
  lyricsId: number | null
  trackName: string
  artistName: string
  albumName: string
  onClose: () => void
}

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  ...getFlexRowCenterStyle({ theme, gap: 1 }),
  justifyContent: 'space-between',
  flexWrap: 'wrap',
}))

const titleTypographySx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

const lyricsTextSx = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'inherit',
} as const

export const LyricsModal = ({
  open,
  lyricsId,
  trackName,
  artistName,
  albumName,
  onClose,
}: LyricsModalProps) => {
  const { enqueueErrorSnackbar } = useSnackbar()
  const { data, isLoading } = useReactQuery<LrclibLyricsDetails>({
    queryKey: ['lyricsDetails', lyricsId],
    url: `/api/lyrics/${lyricsId}`,
    enabled: open && lyricsId !== null,
    throwOnError: (error) => {
      enqueueErrorSnackbar(error, 'Failed to load lyrics')

      return false
    },
  })

  const lyricsToShow = data?.plainLyrics ?? data?.syncedLyrics ?? ''
  const payload = data ?? null

  const {
    fetchNotes,
    abortFetch,
    notesData,
    isLoading: isNotesLoading,
  } = useAnkiNotes(payload)
  const { buildDeckBlob, downloadFile, isExporting } = useAnkiExport()
  const {
    addNotesToAnki,
    isAddingToAnki,
    clearError: clearAnkiConnectError,
  } = useAnkiConnect()

  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [deckNameDialogOpen, setDeckNameDialogOpen] = useState(false)
  const [pendingDownloadNotes, setPendingDownloadNotes] = useState<
    { fields: Record<string, string> }[] | null
  >(null)

  const handleExportClick = useCallback(async () => {
    setNotesModalOpen(true)
    const result = await fetchNotes()

    if (result === null) setNotesModalOpen(false)
  }, [fetchNotes])

  const handleDownloadClick = useCallback(
    (selectedNotes: { fields: Record<string, string> }[]) => {
      setPendingDownloadNotes(selectedNotes)
      setDeckNameDialogOpen(true)
    },
    []
  )

  const handleDeckNameConfirm = useCallback(
    async (deckName: string) => {
      if (!notesData || !pendingDownloadNotes) return
      const blob = await buildDeckBlob({
        deckName,
        modelName: notesData.modelName,
        notes: pendingDownloadNotes,
      })

      if (blob) {
        downloadFile(blob, `${deckName.replace(/\//g, '-')}.apkg`)
        setDeckNameDialogOpen(false)
        setPendingDownloadNotes(null)
        setNotesModalOpen(false)
      }
    },
    [notesData, pendingDownloadNotes, buildDeckBlob, downloadFile]
  )

  const handleAddToDeck = useCallback(
    async (
      selectedNotes: { fields: Record<string, string> }[],
      deckName: string
    ) => {
      if (!notesData) return
      await addNotesToAnki(deckName, selectedNotes, notesData.modelName)
      setNotesModalOpen(false)
    },
    [addNotesToAnki, notesData]
  )

  const dialogTitle = [trackName, artistName, albumName]
    .filter(Boolean)
    .join(' - ')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <StyledDialogTitle>
        <Typography variant="h6" component="span" sx={titleTypographySx}>
          {dialogTitle || 'Lyrics'}
        </Typography>
        {data && (
          <>
            <Box sx={{ flexShrink: 0 }}>
              <AnkiExportButton
                disabled={!lyricsToShow}
                isLoading={isNotesLoading}
                onExport={handleExportClick}
              />
            </Box>
          </>
        )}
      </StyledDialogTitle>
      <DialogContent>
        {isLoading && <LyricsSkeleton />}
        {data && !lyricsToShow && data.instrumental && (
          <Typography color="text.secondary">Instrumental track</Typography>
        )}
        {lyricsToShow && (
          <Typography component="pre" sx={lyricsTextSx}>
            {lyricsToShow}
          </Typography>
        )}
        <NotesChecklistModal
          open={notesModalOpen}
          onClose={() => {
            abortFetch()
            setNotesModalOpen(false)
            clearAnkiConnectError()
          }}
          notesData={notesData}
          isLoading={isNotesLoading}
          onDownload={handleDownloadClick}
          onAddToDeck={handleAddToDeck}
          isDownloading={isExporting}
          isAdding={isAddingToAnki}
        />
        <DeckNameDialog
          open={deckNameDialogOpen}
          defaultName={trackName}
          onClose={() => {
            setDeckNameDialogOpen(false)
            setPendingDownloadNotes(null)
          }}
          onConfirm={handleDeckNameConfirm}
          isDownloading={isExporting}
        />
      </DialogContent>
    </Dialog>
  )
}
