import { createContext, useContext } from 'react'

export type AnkiConnectContextValue = {
  ankiConnectEnabled: boolean
  isAnkiConnectSupported: boolean
  setAnkiConnectEnabled: (enabled: boolean) => void
  selectedDeck: string
  setSelectedDeck: (deck: string) => void
  decks: string[] | null
  decksError: string | null
  getDeckNames: () => Promise<string[]>
  refreshDecks: () => Promise<void>
  onConnectionError: () => void
}

export const AnkiConnectContext = createContext<AnkiConnectContextValue | null>(
  null
)

export const useAnkiConnectContext = () => {
  const ctx = useContext(AnkiConnectContext)

  if (!ctx) {
    throw new Error(
      'useAnkiConnectContext must be used within AnkiConnectProvider'
    )
  }

  return ctx
}
