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

export const useAnkiNotes = (payload: object | null) => {
  const api = useApi()
  const { enqueueErrorSnackbar } = useSnackbar()
  const abortRef = useRef<AbortController | null>(null)
  const [notesData, setNotesData] = useState<AnkiNotesData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNotesData(null)
    setError(null)
  }, [payload])

  const abortFetch = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const fetchNotes = useCallback(async () => {
    if (!payload) return null

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)
    setNotesData(null)
    try {
      const { data } = await api.post<AnkiNotesData>(
        '/api/lyrics/anki/notes',
        payload,
        { signal: controller.signal }
      )
      setNotesData(data)

      return data
    } catch (err: unknown) {
      if (axios.isCancel(err)) return null
      const message = await getApiErrorMessage(err, 'Failed to fetch notes')
      setError(message)
      enqueueErrorSnackbar(message)

      return null
    } finally {
      abortRef.current = null
      setIsLoading(false)
    }
  }, [api, payload, enqueueErrorSnackbar])

  return { fetchNotes, abortFetch, notesData, isLoading, error }
}
