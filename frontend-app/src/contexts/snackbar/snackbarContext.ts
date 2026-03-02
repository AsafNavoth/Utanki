import { createContext, useContext } from 'react'

export type SnackbarContextValue = {
  enqueueSnackbar: (message: string) => void
  enqueueErrorSnackbar: (
    errOrMessage: unknown,
    fallback?: string
  ) => void
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null)

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext)
  if (!ctx) {
    throw new Error('useSnackbar must be used within SnackbarProvider')
  }

  return ctx
}
