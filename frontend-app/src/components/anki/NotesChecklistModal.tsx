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
} from '@mui/material'
import { NotesChecklistSkeleton } from '../common/LoadingSkeletons'
import { stripHtml, truncate } from '../../utils/commonStringUtils'
import { useAnkiConnectContext } from '../../contexts/ankiconnect/ankiconnectContext'
import type { AnkiNote, AnkiNotesData } from '../../hooks/useAnkiNotes'

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
  const { ankiConnectEnabled, selectedDeck } = useAnkiConnectContext()
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
      onDownload={onDownload}
      onAddToDeck={onAddToDeck}
      onClose={onClose}
    />
  )
}

type NotesChecklistContentProps = NotesChecklistModalProps & {
  ankiConnectEnabled: boolean
  selectedDeck: string
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
}: NotesChecklistContentProps) => {
  const [selected, setSelected] = useState<Set<number>>(() =>
    notesData ? new Set(notesData.notes.map((_, i) => i)) : new Set()
  )

  const selectedNotes = useMemo(
    () => notesData?.notes.filter((_, i) => selected.has(i)) ?? [],
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
      allSelected ? new Set() : new Set(notesData.notes.map((_, i) => i))
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
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
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
            </Box>
            <List
              dense
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {notesData.notes.map((note, i) => {
                const word = note.fields?.Word ?? ''
                const def =
                  note.fields?.['Word Meaning'] ?? note.fields?.Definition ?? ''
                const defPreview = truncate(stripHtml(def), 60)

                return (
                  <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selected.has(i)}
                          onChange={() => handleToggle(i)}
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
            </List>
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
      </DialogActions>
    </Dialog>
  )
}
