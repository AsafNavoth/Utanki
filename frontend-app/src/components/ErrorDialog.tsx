import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'

type ErrorDialogProps = {
  open: boolean
  message: string
  onClose: () => void
}

export const ErrorDialog = ({ open, message, onClose }: ErrorDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Something went wrong</DialogTitle>
    <DialogContent>
      <Typography color="error">{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">
        Dismiss
      </Button>
    </DialogActions>
  </Dialog>
)
