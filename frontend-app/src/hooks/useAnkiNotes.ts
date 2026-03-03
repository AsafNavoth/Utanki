import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useSnackbar } from '../contexts/snackbar/snackbarContext'
import { useApi } from './useApi'
import { getApiErrorMessage } from '../utils/apiUtils'

export type AnkiNote = { fields: Record<string, string> }

export type AnkiNotesData = {
  deckName: string
  modelName: string
  notes: AnkiNote[]
}

type AnkiNotesPayload = Record<string, unknown>

export const useAnkiNotes = (payload: AnkiNotesPayload | null) => {
  const api = useApi()
  const { enqueueErrorSnackbar } = useSnackbar()
  const abortRef = useRef<AbortController | null>(null)
  const [notesData, setNotesData] = useState<AnkiNotesData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setNotesData(null)
    setIsLoading(false)
    setError(null)
  }, [payload])

  const abortFetch = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setNotesData(null)
    setIsLoading(false)
  }, [])

  const fetchNotes = useCallback(async (): Promise<AnkiNotesData | null> => {
    if (!payload) return null

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setNotesData(null)
    setIsLoading(true)

    const isStale = () => abortRef.current !== controller

    try {
      const { data } = await api.post<AnkiNotesData>(
        '/api/lyrics/anki/notes',
        payload,
        { signal: controller.signal }
      )

      if (isStale()) return null

      setNotesData(data)

      return data

    } catch (error: unknown) {
      const silentFailure = axios.isCancel(error) || isStale()

      if (silentFailure) return null

      const message = await getApiErrorMessage(error, 'Failed to fetch notes')
      setError(message)
      enqueueErrorSnackbar(message)

      return null
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsLoading(false)
    }
  }, [payload, api, enqueueErrorSnackbar])

  return {
    fetchNotes,
    abortFetch,
    notesData,
    isLoading,
    error,
  }
}
