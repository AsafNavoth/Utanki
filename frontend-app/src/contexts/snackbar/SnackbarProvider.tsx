import React, { useCallback, useState } from 'react'
import { Box, Snackbar, styled } from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import { SnackbarContext } from './snackbarContext'
import { getErrorMessage } from '../../utils/commonStringUtils'
import { getFlexRowCenterStyle } from '../../utils/commonStyles'

type SnackbarProviderProps = {
  children: React.ReactNode
}

type SnackbarState = {
  message: string
  severity: 'error' | 'default'
} | null

const ErrorSnackbarMessageRoot = styled(Box)(({ theme }) =>
  getFlexRowCenterStyle({ theme, gap: 1 })
)

const ErrorSnackbarMessage = ({ message }: { message: string }) => (
  <ErrorSnackbarMessageRoot>
    <WarningIcon fontSize="small" />
    {message}
  </ErrorSnackbarMessageRoot>
)

export const SnackbarProvider = ({ children }: SnackbarProviderProps) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>(null)

  const enqueueSnackbar = useCallback((msg: string) => {
    setSnackbar({ message: msg, severity: 'default' })
  }, [])

  const enqueueErrorSnackbar = useCallback(
    (errOrMessage: unknown, fallback?: string) => {
      setSnackbar({
        message: getErrorMessage(errOrMessage, fallback ?? 'An error occurred'),
        severity: 'error',
      })
    },
    []
  )

  const handleClose = useCallback(() => {
    setSnackbar(null)
  }, [])

  const messageContent =
    snackbar?.severity === 'error' ? (
      <ErrorSnackbarMessage message={snackbar.message} />
    ) : (
      snackbar?.message
    )

  return (
    <SnackbarContext.Provider value={{ enqueueSnackbar, enqueueErrorSnackbar }}>
      {children}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        message={messageContent}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </SnackbarContext.Provider>
  )
}
