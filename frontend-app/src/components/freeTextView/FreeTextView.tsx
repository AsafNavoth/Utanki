import { Box, TextField, Typography, styled } from '@mui/material'
import { getFlexColumnGapStyle, flexColumnHalf } from '../../utils/commonStyles'
import { useCallback, useMemo, useState } from 'react'
import { DeckNameDialog } from '../anki/DeckNameDialog'
import { AnkiExportButton } from '../anki/AnkiExportButton'
import { NotesChecklistModal } from '../anki/NotesChecklistModal'
import { useAnkiConnect } from '../../hooks/useAnkiConnect'
import { useAnkiExport } from '../../hooks/useAnkiExport'
import { useAnkiNotes } from '../../hooks/useAnkiNotes'
import { maxLyricsChars } from '../../env'

const DEFAULT_DECK_NAME = 'Pasted lyrics'

const LyricsTextField = styled(TextField)({
  flex: 1,
  minHeight: 0,
  '& .MuiInputBase-root': {
    height: '100%',
    alignItems: 'flex-start',
  },
  '& .MuiInputBase-input': {
    overflow: 'auto !important',
    height: '100% !important',
  },
})

type FreeTextViewProps = {
  hideTitle?: boolean
}

export const FreeTextView = ({ hideTitle = false }: FreeTextViewProps) => {
  const [text, setText] = useState('')
  const trimmedText = text.trim()

  const payload = useMemo(() => {
    if (!trimmedText) return null

    return {
      plainLyrics: trimmedText,
      trackName: DEFAULT_DECK_NAME,
      artistName: '',
    }
  }, [trimmedText])

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

  const charCount = text.length
  const isTooLong = charCount > maxLyricsChars
  const canExport = trimmedText.length > 0 && !isTooLong

  return (
    <Box sx={flexColumnHalf}>
      {!hideTitle && (
        <Typography variant="h6">Paste lyrics</Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        Paste song lyrics or any Japanese text to create an Anki deck from the
        vocabulary.
      </Typography>
      <Box
        sx={(theme) => ({
          flex: 1,
          minHeight: 0,
          ...getFlexColumnGapStyle({ theme, gap: 0 }),
        })}
      >
        <LyricsTextField
          label="Lyrics or text"
          placeholder="Paste or type Japanese text here..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          multiline
          minRows={6}
          maxRows={20}
          fullWidth
          helperText={`${charCount}/${maxLyricsChars}`}
          error={isTooLong}
          slotProps={{
            htmlInput: {
              maxLength: maxLyricsChars,
            },
          }}
        />
      </Box>
      <AnkiExportButton
        disabled={!canExport}
        isLoading={isNotesLoading}
        onExport={handleExportClick}
      />
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
        defaultName={DEFAULT_DECK_NAME}
        onClose={() => {
          setDeckNameDialogOpen(false)
          setPendingDownloadNotes(null)
        }}
        onConfirm={handleDeckNameConfirm}
        isDownloading={isExporting}
      />
    </Box>
  )
}
