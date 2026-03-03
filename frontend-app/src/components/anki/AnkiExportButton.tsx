import { Box, Button, CircularProgress, styled } from '@mui/material'
import { getFlexRowWrapStyle } from '../../utils/commonStyles'

const AnkiExportButtonRoot = styled(Box)(({ theme }) =>
  getFlexRowWrapStyle({ theme })
)

type AnkiExportButtonProps = {
  disabled?: boolean
  isLoading?: boolean
  onExport: () => void
}

export const AnkiExportButton = ({
  disabled = false,
  isLoading = false,
  onExport,
}: AnkiExportButtonProps) => (
  <AnkiExportButtonRoot>
    <Button
      variant="contained"
      size="medium"
      onClick={onExport}
      disabled={disabled || isLoading}
      startIcon={
        isLoading ? <CircularProgress size={16} color="inherit" /> : undefined
      }
    >
      {isLoading ? 'Loading…' : 'Export'}
    </Button>
  </AnkiExportButtonRoot>
)
