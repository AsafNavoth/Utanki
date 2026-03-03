import { useCallback, useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  ListItem,
  Tooltip,
  Typography,
  Box,
  styled,
} from '@mui/material'
import { NotesChecklistSkeleton } from '../common/LoadingSkeletons'
import {
  getTextWithoutHtml,
  getTruncatedText,
} from '../../utils/commonStringUtils'
import { useAnkiConnectContext } from '../../contexts/ankiconnect/ankiconnectContext'
import {
  getBorderedListStyle,
  getFlexRowCenterStyle,
} from '../../utils/commonStyles'
import type { AnkiNote, AnkiNotesData } from '../../hooks/useAnkiNotes'

const SelectAllRow = styled(Box)(({ theme }) => ({
  ...getFlexRowCenterStyle({ theme, gap: 2 }),
  marginBottom: theme.spacing(2),
}))

const NotesList = styled(List)(({ theme }) => getBorderedListStyle({ theme }))

type NotesChecklistModalProps = {
  open: boolean
  onClose: () => void
  notesData: AnkiNotesData | null
  isLoading: boolean
  onDownload: (selectedNotes: AnkiNote[]) => void
  onAddToDeck: (
    selectedNotes: AnkiNote[],
    deckName: string
  ) => void | Promise<void>
  isDownloading?: boolean
  isAdding?: boolean
}

export const NotesChecklistModal = ({
  open,
  onClose,
  notesData,
  isLoading,
  onDownload,
  onAddToDeck,
  isDownloading = false,
  isAdding = false,
}: NotesChecklistModalProps) => {
  const { ankiConnectEnabled, selectedDeck, isMobile } = useAnkiConnectContext()
  const selectionKey = notesData
    ? `${notesData.deckName}-${notesData.notes.length}`
    : 'empty'

  return (
    <NotesChecklistContent
      key={selectionKey}
      open={open}
      notesData={notesData}
      isLoading={isLoading}
      isDownloading={isDownloading}
      isAdding={isAdding}
      ankiConnectEnabled={ankiConnectEnabled}
      selectedDeck={selectedDeck}
      isMobile={isMobile}
      onDownload={onDownload}
      onAddToDeck={onAddToDeck}
      onClose={onClose}
    />
  )
}

type NotesChecklistContentProps = NotesChecklistModalProps & {
  ankiConnectEnabled: boolean
  selectedDeck: string
  isMobile: boolean
}

const NotesChecklistContent = ({
  open,
  notesData,
  isLoading,
  onDownload,
  onAddToDeck,
  onClose,
  isDownloading = false,
  isAdding = false,
  ankiConnectEnabled,
  selectedDeck,
  isMobile,
}: NotesChecklistContentProps) => {
  const [selected, setSelected] = useState<Set<number>>(() =>
    notesData ? new Set(notesData.notes.map((_, index) => index)) : new Set()
  )

  const selectedNotes = useMemo(
    () => notesData?.notes.filter((_, index) => selected.has(index)) ?? [],
    [notesData, selected]
  )

  const allSelected = notesData
    ? selected.size === notesData.notes.length
    : false
  const someSelected = selected.size > 0

  const handleToggle = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (next.has(index)) next.delete(index)
      else next.add(index)

      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!notesData) return
    setSelected(
      allSelected ? new Set() : new Set(notesData.notes.map((_, index) => index))
    )
  }, [notesData, allSelected])

  const handleDownload = useCallback(() => {
    onDownload(selectedNotes)
  }, [onDownload, selectedNotes])

  const handleAddToDeck = useCallback(() => {
    if (!selectedDeck) return
    onAddToDeck(selectedNotes, selectedDeck)
  }, [onAddToDeck, selectedNotes, selectedDeck])

  const handleClose = useCallback(() => {
    setSelected(new Set())
    onClose()
  }, [onClose])

  const isBusy = isDownloading || isAdding

  const dialogTitle = isLoading ? 'Loading cards...' : 'Choose cards to export'

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        {isLoading && <NotesChecklistSkeleton />}
        {notesData && !isLoading && (
          <>
            <SelectAllRow>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={handleSelectAll}
                  />
                }
                label={allSelected ? 'Deselect all' : 'Select all'}
              />
              <Typography variant="body2" color="text.secondary">
                {selected.size} of {notesData.notes.length} selected
              </Typography>
            </SelectAllRow>
            <NotesList dense>
              {notesData.notes.map((note, index) => {
                const word = note.fields?.Word ?? ''
                const def =
                  note.fields?.['Word Meaning'] ?? note.fields?.Definition ?? ''
                const defPreview = getTruncatedText(getTextWithoutHtml(def), 60)

                return (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selected.has(index)}
                          onChange={() => handleToggle(index)}
                        />
                      }
                      label={
                        <Box>
                          <Typography component="span" fontWeight="medium">
                            {word}
                          </Typography>
                          {defPreview && (
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              — {defPreview}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </ListItem>
                )
              })}
            </NotesList>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={handleDownload}
          disabled={!someSelected || isBusy || isLoading}
        >
          {isDownloading ? 'Preparing…' : 'Download'}
        </Button>
        {!isMobile && (
          <Tooltip
            title={
              !ankiConnectEnabled
                ? 'Enable AnkiConnect integration to add cards to an existing deck'
                : ''
            }
          >
            <span>
              <Button
                variant="contained"
                onClick={handleAddToDeck}
                disabled={
                  !someSelected ||
                  isBusy ||
                  isLoading ||
                  !ankiConnectEnabled ||
                  !selectedDeck
                }
                startIcon={
                  isAdding ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {isAdding ? 'Adding…' : 'Add to deck'}
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  )
}
