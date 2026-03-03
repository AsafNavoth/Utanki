import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material'
type DeckNameDialogProps = {
  open: boolean
  defaultName: string
  onClose: () => void
  onConfirm: (deckName: string) => void | Promise<void>
  isDownloading?: boolean
}

export const DeckNameDialog = ({
  open,
  defaultName,
  onClose,
  onConfirm,
  isDownloading = false,
}: DeckNameDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Name your deck</DialogTitle>
    {open && (
      <DeckNameForm
        key={defaultName}
        defaultName={defaultName}
        onConfirm={onConfirm}
        onClose={onClose}
        isDownloading={isDownloading}
      />
    )}
  </Dialog>
)

type DeckNameFormProps = {
  defaultName: string
  onConfirm: (deckName: string) => void | Promise<void>
  onClose: () => void
  isDownloading: boolean
}

const DeckNameForm = ({
  defaultName,
  onConfirm,
  onClose,
  isDownloading,
}: DeckNameFormProps) => {
  const [deckName, setDeckName] = useState(defaultName)

  const handleConfirm = () => {
    const trimmed = deckName.trim() || defaultName
    onConfirm(trimmed)
  }

  return (
    <>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Deck name"
          placeholder={defaultName}
          value={deckName}
          onChange={(event) => setDeckName(event.target.value)}
          size="small"
          sx={{ mt: 1 }}
          slotProps={{
            htmlInput: {
              'aria-label': 'Deck name for the downloaded file',
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isDownloading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing…' : 'Download'}
        </Button>
      </DialogActions>
    </>
  )
}
