import { useCallback, useContext, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from '../contexts/snackbar/snackbarContext'
import { AnkiConnectContext } from '../contexts/ankiconnect/ankiconnectContext'
import { getPluralSuffix } from '../utils/commonStringUtils'
import { ANKI_CONNECTION_ERROR_MESSAGE } from '../utils/commonStringUtils'
import { getApiErrorMessage, isAnkiConnectionError } from '../utils/apiUtils'
import { useApi } from './useApi'
import { useReactQuery } from './useReactQuery'
import { excludedDecks } from '../env'
import type { AnkiNote } from './useAnkiNotes'

const ANKICONNECT_VERSION = 6
const ANKICONNECT_URL = 'http://localhost:8765'

export type AnkiModelConfig = {
  modelName: string
  fields: string[]
  cardTemplates: Array<{ name: string; front: string; back: string }>
  css: string
}

type AnkiConnectRequest = {
  action: string
  version: number
  params?: Record<string, unknown>
}

const invokeAnkiConnect = async <T>(
  request: AnkiConnectRequest
): Promise<T> => {
  const { data } = await axios.post<{ result?: T; error?: string }>(
    ANKICONNECT_URL,
    request,
    { headers: { 'Content-Type': 'application/json' } }
  )

  if (data.error) {
    throw new Error(data.error)
  }
  const result = data.result

  if (result === undefined) {
    throw new Error('Invalid AnkiConnect response')
  }

  return result
}

const FIELD_ALIASES: Record<string, string[]> = {
  Word: ['Word', 'word'],
  Sentence: ['Sentence', 'sentence'],
  'Word Meaning': ['Word Meaning', 'WordMeaning', 'Definition'],
}

const getFieldsForNoteFromConfig = (
  note: AnkiNote,
  fieldNames: string[]
): Record<string, string> => {
  const noteFields = note.fields ?? {}

  return Object.fromEntries(
    fieldNames.map((canonicalFieldName) => {
      const possibleKeys = FIELD_ALIASES[canonicalFieldName] ?? [
        canonicalFieldName,
      ]
      const firstNonEmptyValue = possibleKeys
        .map((aliasKey) => noteFields[aliasKey])
        .find(
          (candidateValue) =>
            candidateValue !== undefined && candidateValue !== ''
        )

      return [canonicalFieldName, String(firstNonEmptyValue ?? '')]
    })
  )
}

const ANKI_MODEL_CONFIG_QUERY_KEY = ['ankiModelConfig'] as const

export const useAnkiConnect = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { enqueueSnackbar, enqueueErrorSnackbar } = useSnackbar()
  const ankiContext = useContext(AnkiConnectContext)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useReactQuery<AnkiModelConfig>({
    queryKey: ANKI_MODEL_CONFIG_QUERY_KEY,
    url: '/api/lyrics/anki/model-config',
    enabled: ankiContext?.ankiConnectEnabled ?? false,
  })

  const addNotesToAnki = useCallback(
    async (targetDeck: string, notes: AnkiNote[], modelName: string) => {
      if (notes.length === 0) return
      setIsAdding(true)
      setError(null)
      try {
        const config = await queryClient.fetchQuery<AnkiModelConfig>({
          queryKey: ANKI_MODEL_CONFIG_QUERY_KEY,
          queryFn: async () => {
            const { data } = await api.get<AnkiModelConfig | null>(
              '/api/lyrics/anki/model-config'
            )

            if (!data) throw new Error('Failed to fetch model config')

            return data
          },
        })

        const deckNames = await invokeAnkiConnect<string[]>({
          action: 'deckNames',
          version: ANKICONNECT_VERSION,
        })
        const validDecks = deckNames.filter(
          (deckName) => !excludedDecks.includes(deckName)
        )

        if (!validDecks.includes(targetDeck)) {
          throw new Error(
            'The selected deck no longer exists. Please select a different deck from the dropdown.'
          )
        }

        const modelNames = await invokeAnkiConnect<string[]>({
          action: 'modelNames',
          version: ANKICONNECT_VERSION,
        })
        const modelExists = modelNames.includes(modelName)

        if (!modelExists) {
          await invokeAnkiConnect({
            action: 'createModel',
            version: ANKICONNECT_VERSION,
            params: {
              modelName,
              inOrderFields: config.fields,
              cardTemplates: config.cardTemplates.map((template) => ({
                Name: template.name,
                Front: template.front,
                Back: template.back,
              })),
              css: config.css,
            },
          })
        } else {
          const templates = Object.fromEntries(
            config.cardTemplates.map((template) => [
              template.name,
              { Front: template.front, Back: template.back },
            ])
          )
          await invokeAnkiConnect({
            action: 'updateModelTemplates',
            version: ANKICONNECT_VERSION,
            params: {
              model: { name: modelName, templates },
            },
          })
          await invokeAnkiConnect({
            action: 'updateModelStyling',
            version: ANKICONNECT_VERSION,
            params: { model: { name: modelName, css: config.css } },
          })
        }

        const getFieldsForNote = (note: AnkiNote): Record<string, string> =>
          getFieldsForNoteFromConfig(note, config.fields)

        await invokeAnkiConnect({
          action: 'createDeck',
          version: ANKICONNECT_VERSION,
          params: { deck: targetDeck },
        })

        const notesToAdd = notes.map((note) => ({
          deckName: targetDeck,
          modelName,
          fields: getFieldsForNote(note),
        }))

        const canAdd = await invokeAnkiConnect<boolean[]>({
          action: 'canAddNotes',
          version: ANKICONNECT_VERSION,
          params: { notes: notesToAdd },
        })

        const filteredNotesToAdd = notesToAdd.filter(
          (_, index) => canAdd[index]
        )
        const skippedNotesCount = notesToAdd.length - filteredNotesToAdd.length

        if (filteredNotesToAdd.length > 0) {
          await invokeAnkiConnect<number[]>({
            action: 'addNotes',
            version: ANKICONNECT_VERSION,
            params: { notes: filteredNotesToAdd },
          })
        }

        const addedCount = filteredNotesToAdd.length
        const message =
          addedCount > 0
            ? `Added ${addedCount} card${getPluralSuffix(addedCount)} to ${targetDeck}${skippedNotesCount > 0 ? ` (${skippedNotesCount} already in deck)` : ''}`
            : `All ${notesToAdd.length} card${getPluralSuffix(notesToAdd.length)} already in ${targetDeck}`

        enqueueSnackbar(message)
      } catch (error) {
        const message = await getApiErrorMessage(
          error,
          'Failed to add cards to Anki'
        )
        const isConnectionError = isAnkiConnectionError(error)
        const displayMessage = isConnectionError
          ? ANKI_CONNECTION_ERROR_MESSAGE
          : message
        setError(displayMessage)
        enqueueErrorSnackbar(displayMessage)

        if (isConnectionError) ankiContext?.onConnectionError()
        throw error
      } finally {
        setIsAdding(false)
      }
    },
    [api, queryClient, enqueueSnackbar, enqueueErrorSnackbar, ankiContext]
  )

  const getDeckNames = useCallback(async (): Promise<string[]> => {
    return invokeAnkiConnect<string[]>({
      action: 'deckNames',
      version: ANKICONNECT_VERSION,
    })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    addNotesToAnki,
    getDeckNames,
    isAddingToAnki: isAdding,
    error,
    clearError,
  }
}
