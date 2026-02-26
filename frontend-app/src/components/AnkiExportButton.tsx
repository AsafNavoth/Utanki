import { Box, Button, CircularProgress, Typography } from '@mui/material'

type AnkiExportButtonProps = {
  hasPreparedFile: boolean
  isExporting: boolean
  disabled?: boolean
  error?: string | null
  onPrepare: () => void
  onDownload: () => void
}

export const AnkiExportButton = ({
  hasPreparedFile,
  isExporting,
  disabled = false,
  error,
  onPrepare,
  onDownload,
}: AnkiExportButtonProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Button
        variant="outlined"
        onClick={hasPreparedFile ? onDownload : onPrepare}
        disabled={disabled || isExporting}
        startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {isExporting ? 'Preparing…' : hasPreparedFile ? 'Download' : 'Export to Anki'}
      </Button>
      {error && (
        <Typography color="error" sx={{ fontSize: '0.875rem' }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}
