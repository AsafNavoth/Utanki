import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery, useTheme } from '@mui/material'
import { useSnackbar } from '../snackbar/snackbarContext'
import { getErrorMessage } from '../../utils/commonStringUtils'
import { ANKI_CONNECTION_ERROR_MESSAGE } from '../../utils/commonStringUtils'
import { isAnkiConnectionError } from '../../utils/apiUtils'
import { useAnkiConnect } from '../../hooks/useAnkiConnect'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { excludedDecks } from '../../env'
import { AnkiConnectContext } from './ankiconnectContext'

const ANKICONNECT_ENABLED_KEY = 'utanki-ankiconnect-enabled'
const SELECTED_DECK_KEY = 'utanki-selected-deck'
const DECK_REFRESH_INTERVAL_MS = 30_000

type AnkiConnectProviderProps = {
  children: React.ReactNode
}

export const AnkiConnectProvider = ({ children }: AnkiConnectProviderProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const onConnectionError = () => {
    setAnkiConnectEnabled(false)
  }

  const setDecksFromNames = useCallback(
    (names: string[]) => {
      const filtered = names.filter(
        (deckName) => !excludedDecks.includes(deckName)
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
    (error: unknown) => {
      const msg = getErrorMessage(error, 'Failed to fetch decks')
      const isConnectionError = isAnkiConnectionError(error)
      const displayMsg = isConnectionError ? ANKI_CONNECTION_ERROR_MESSAGE : msg
      setDecksError(displayMsg)
      enqueueErrorSnackbar(displayMsg)

      if (isConnectionError) setAnkiConnectEnabled(false)
    },
    [enqueueErrorSnackbar, setAnkiConnectEnabled]
  )

  const loadDecks = useCallback(async () => {
    const names = await getDeckNames()
    setDecksFromNames(names)
  }, [getDeckNames, setDecksFromNames])

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
    } catch (error) {
      handleDeckFetchError(error)
    }
  }, [ankiConnectEnabled, loadDecks, handleDeckFetchError])

  useEffect(() => {
    if (!ankiConnectEnabled) return

    const id = setInterval(refreshDecks, DECK_REFRESH_INTERVAL_MS)

    return () => clearInterval(id)
  }, [ankiConnectEnabled, refreshDecks])

  return (
    <AnkiConnectContext.Provider
      value={{
        ankiConnectEnabled: ankiConnectEnabled && !isMobile,
        isMobile,
        setAnkiConnectEnabled,
        selectedDeck,
        setSelectedDeck,
        decks,
        decksError,
        getDeckNames,
        refreshDecks,
        onConnectionError,
      }}
    >
      {children}
    </AnkiConnectContext.Provider>
  )
}
