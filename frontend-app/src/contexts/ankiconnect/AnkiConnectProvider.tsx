import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnackbar } from '../snackbar/snackbarContext'
import { getErrorMessage } from '../../utils/commonStringUtils'
import { ANKI_CONNECTION_ERROR_MESSAGE } from '../../utils/commonStringUtils'
import { isAnkiConnectionError } from '../../utils/apiUtils'
import { useAnkiConnect } from '../../hooks/useAnkiConnect'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
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
  const [ankiConnectEnabled, setAnkiConnectEnabled] = useLocalStorageState({
    key: ANKICONNECT_ENABLED_KEY,
    defaultValue: false,
    parse: (storedValue) => (storedValue === 'true' ? true : null),
  })
  const [selectedDeck, setSelectedDeck] = useLocalStorageState({
    key: SELECTED_DECK_KEY,
    defaultValue: '',
  })
  const [decks, setDecks] = useState<string[] | null>(null)
  const [decksError, setDecksError] = useState<string | null>(null)
  const selectedDeckRef = useRef(selectedDeck)
  selectedDeckRef.current = selectedDeck

  const applyDeckNames = useCallback(
    (names: string[]) => {
      const filtered = names.filter(
        (deckName) => !EXCLUDED_DECKS.includes(deckName)
      )
      setDecks(filtered)
      setDecksError(null)
      const prev = selectedDeckRef.current
      const nextDeck = filtered.includes(prev) ? prev : (filtered[0] ?? '')
      setSelectedDeck(nextDeck)
    },
    [setSelectedDeck]
  )

  const handleDeckFetchError = useCallback(
    (err: unknown) => {
      const msg = getErrorMessage(err, 'Failed to fetch decks')
      const isConnectionError = isAnkiConnectionError(err)
      const displayMsg = isConnectionError ? ANKI_CONNECTION_ERROR_MESSAGE : msg
      setDecksError(displayMsg)
      enqueueErrorSnackbar(displayMsg)
      if (isConnectionError) setAnkiConnectEnabled(false)
    },
    [enqueueErrorSnackbar, setAnkiConnectEnabled]
  )

  const loadDecks = useCallback(async () => {
    const names = await getDeckNames()
    applyDeckNames(names)
  }, [getDeckNames, applyDeckNames])

  useEffect(() => {
    setDecks(null)
    setDecksError(null)
    if (!ankiConnectEnabled) return

    loadDecks().catch(handleDeckFetchError)
  }, [ankiConnectEnabled, loadDecks, handleDeckFetchError])

  const refreshDecks = useCallback(async () => {
    if (!ankiConnectEnabled) return
    try {
      await loadDecks()
    } catch (err) {
      handleDeckFetchError(err)
    }
  }, [ankiConnectEnabled, loadDecks, handleDeckFetchError])

  const onConnectionError = useCallback(() => {
    setAnkiConnectEnabled(false)
  }, [])

  useEffect(() => {
    if (!ankiConnectEnabled) return

    const id = setInterval(refreshDecks, DECK_REFRESH_INTERVAL_MS)

    return () => clearInterval(id)
  }, [ankiConnectEnabled, refreshDecks])

  const value = {
    ankiConnectEnabled,
    setAnkiConnectEnabled,
    selectedDeck,
    setSelectedDeck,
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
