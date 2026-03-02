import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnackbar } from '../snackbar/snackbarContext'
import { getErrorMessage } from '../../utils/commonStringUtils'
import { getStorageItem, setStorageItem } from '../../utils/storage'
import { ANKI_CONNECTION_ERROR_MESSAGE } from '../../utils/commonStringUtils'
import { isAnkiConnectionError } from '../../utils/apiUtils'
import { useAnkiConnect } from '../../hooks/useAnkiConnect'
import { AnkiConnectContext } from './ankiconnectContext'

const ANKICONNECT_ENABLED_KEY = 'utanki-ankiconnect-enabled'
const SELECTED_DECK_KEY = 'utanki-selected-deck'
const EXCLUDED_DECKS = ['Default', 'デフォルト']
const DECK_REFRESH_INTERVAL_MS = 30_000

type AnkiConnectProviderProps = {
  children: React.ReactNode
}

export const AnkiConnectProvider = ({ children }: AnkiConnectProviderProps) => {
  const { getDeckNames } = useAnkiConnect()
  const { enqueueErrorSnackbar } = useSnackbar()
  const [ankiConnectEnabled, setAnkiConnectEnabled] = useState(() =>
    getStorageItem(
      ANKICONNECT_ENABLED_KEY,
      (v) => (v === 'true' ? true : null),
      false
    )
  )
  const [selectedDeck, setSelectedDeckState] = useState(() =>
    getStorageItem(SELECTED_DECK_KEY, (v) => v, '')
  )
  const [decks, setDecks] = useState<string[] | null>(null)
  const [decksError, setDecksError] = useState<string | null>(null)
  const selectedDeckRef = useRef(selectedDeck)
  selectedDeckRef.current = selectedDeck

  const setEnabled = useCallback((enabled: boolean) => {
    setAnkiConnectEnabled(enabled)
    setStorageItem(ANKICONNECT_ENABLED_KEY, String(enabled))
  }, [])

  const setDeck = useCallback((deck: string) => {
    setSelectedDeckState(deck)
    setStorageItem(SELECTED_DECK_KEY, deck)
  }, [])

  const persistAndSetDeck = useCallback((deck: string) => {
    setSelectedDeckState(deck)
    setStorageItem(SELECTED_DECK_KEY, deck)
  }, [])

  useEffect(() => {
    if (!ankiConnectEnabled) {
      setDecks(null)
      setDecksError(null)

      return
    }
    setDecks(null)
    setDecksError(null)
    getDeckNames()
      .then((names) => {
        const filtered = names.filter((n) => !EXCLUDED_DECKS.includes(n))
        setDecks(filtered)
        const prev = selectedDeckRef.current
        const nextDeck = filtered.includes(prev) ? prev : filtered[0] ?? ''
        persistAndSetDeck(nextDeck)
      })
      .catch((err) => {
        const msg = getErrorMessage(err, 'Failed to fetch decks')
        const isConnectionError = isAnkiConnectionError(err)
        const displayMsg = isConnectionError
          ? ANKI_CONNECTION_ERROR_MESSAGE
          : msg
        setDecksError(displayMsg)
        enqueueErrorSnackbar(displayMsg)
        if (isConnectionError) setEnabled(false)
      })
  }, [ankiConnectEnabled, getDeckNames, enqueueErrorSnackbar, setEnabled, persistAndSetDeck])

  const refreshDecks = useCallback(async () => {
    if (!ankiConnectEnabled) return
    try {
      const names = await getDeckNames()
      const filtered = names.filter((n) => !EXCLUDED_DECKS.includes(n))
      setDecks(filtered)
      setDecksError(null)
      const prev = selectedDeckRef.current
      const nextDeck = filtered.includes(prev) ? prev : filtered[0] ?? ''
      persistAndSetDeck(nextDeck)
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to fetch decks')
      const isConnectionError = isAnkiConnectionError(err)
      const displayMsg = isConnectionError ? ANKI_CONNECTION_ERROR_MESSAGE : msg
      setDecksError(displayMsg)
      enqueueErrorSnackbar(displayMsg)
      if (isConnectionError) setEnabled(false)
    }
  }, [ankiConnectEnabled, getDeckNames, enqueueErrorSnackbar, setEnabled, persistAndSetDeck])

  const onConnectionError = useCallback(() => {
    setEnabled(false)
  }, [setEnabled])

  useEffect(() => {
    if (!ankiConnectEnabled) return

    const id = setInterval(refreshDecks, DECK_REFRESH_INTERVAL_MS)

    return () => clearInterval(id)
  }, [ankiConnectEnabled, refreshDecks])

  const value = {
    ankiConnectEnabled,
    setAnkiConnectEnabled: setEnabled,
    selectedDeck,
    setSelectedDeck: setDeck,
    decks,
    decksError,
    getDeckNames,
    refreshDecks,
    onConnectionError,
  }

  return (
    <AnkiConnectContext.Provider value={value}>
      {children}
    </AnkiConnectContext.Provider>
  )
}
