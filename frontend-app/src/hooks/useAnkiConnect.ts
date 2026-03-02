import { useCallback, useContext, useState } from 'react'
import { type AxiosInstance } from 'axios'
import { useSnackbar } from '../contexts/snackbar/snackbarContext'
import { AnkiConnectContext } from '../contexts/ankiconnect/ankiconnectContext'
import { pluralSuffix } from '../utils/commonStringUtils'
import { ANKI_CONNECTION_ERROR_MESSAGE } from '../utils/commonStringUtils'
import { getApiErrorMessage, isAnkiConnectionError } from '../utils/apiUtils'
import { useApi } from './useApi'
import type { AnkiNote } from './useAnkiNotes'

const ANKICONNECT_VERSION = 6
const EXCLUDED_DECKS = ['Default', 'デフォルト']

const CARD_CSS = `.card {
 font-family: "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", "Noto Sans JP", "Noto Sans CJK JP", Osaka, "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", "MS UI Gothic", sans-serif;
 font-size: 44px;
 text-align: center;
}
.entry, .char { margin-bottom: 0.5em; }`

const FRONT_TEMPLATE =
  '<div lang="ja">\n{{Word}}\n<div style=\'font-size: 20px;\'>{{Sentence}}</div>\n</div>'

const BACK_TEMPLATE =
  "<div lang=\"ja\">\n{{Word}}\n<div style='font-size: 25px;'>{{Sentence}}</div>\n\n\n<div style='font-size: 25px; padding-bottom:20px'>{{Word Meaning}}</div>\n\n</div>"

const LYRICS_VOCABULARY_MODEL = {
  inOrderFields: ['Word', 'Sentence', 'Word Meaning'],
  cardTemplates: [
    { Name: 'Card 1', Front: FRONT_TEMPLATE, Back: BACK_TEMPLATE },
  ],
  css: CARD_CSS,
}

type AnkiConnectRequest = {
  action: string
  version: number
  params?: Record<string, unknown>
}

const invokeAnkiConnect = async <T>(
  api: AxiosInstance,
  request: AnkiConnectRequest
): Promise<T> => {
  const { data } = await api.post<{ result?: T; error?: string }>(
    '/api/ankiconnect',
    request
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

export const useAnkiConnect = () => {
  const api = useApi()
  const { enqueueSnackbar, enqueueErrorSnackbar } = useSnackbar()
  const ankiContext = useContext(AnkiConnectContext)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addToAnki = useCallback(
    async (targetDeck: string, notes: AnkiNote[], modelName: string) => {
      if (notes.length === 0) return
      setIsAdding(true)
      setError(null)
      try {
        const deckNames = await invokeAnkiConnect<string[]>(api, {
          action: 'deckNames',
          version: ANKICONNECT_VERSION,
        })
        const validDecks = deckNames.filter((n) => !EXCLUDED_DECKS.includes(n))
        if (!validDecks.includes(targetDeck)) {
          throw new Error(
            'The selected deck no longer exists. Please select a different deck from the dropdown.'
          )
        }

        const modelNames = await invokeAnkiConnect<string[]>(api, {
          action: 'modelNames',
          version: ANKICONNECT_VERSION,
        })
        const modelExists = modelNames.includes(modelName)
        if (!modelExists) {
          await invokeAnkiConnect(api, {
            action: 'createModel',
            version: ANKICONNECT_VERSION,
            params: {
              modelName,
              inOrderFields: LYRICS_VOCABULARY_MODEL.inOrderFields,
              cardTemplates: LYRICS_VOCABULARY_MODEL.cardTemplates,
              css: LYRICS_VOCABULARY_MODEL.css,
            },
          })
        }

        if (modelExists) {
          await invokeAnkiConnect(api, {
            action: 'updateModelTemplates',
            version: ANKICONNECT_VERSION,
            params: {
              model: {
                name: modelName,
                templates: {
                  'Card 1': { Front: FRONT_TEMPLATE, Back: BACK_TEMPLATE },
                },
              },
            },
          })
          await invokeAnkiConnect(api, {
            action: 'updateModelStyling',
            version: ANKICONNECT_VERSION,
            params: { model: { name: modelName, css: CARD_CSS } },
          })
        }

        const getFieldsForNote = (note: AnkiNote): Record<string, string> => {
          const f = note.fields ?? {}

          return {
            Word: String(f.Word ?? f.word ?? ''),
            Sentence: String(f.Sentence ?? f.sentence ?? ''),
            'Word Meaning': String(f['Word Meaning'] ?? f.WordMeaning ?? ''),
          }
        }

        await invokeAnkiConnect(api, {
          action: 'createDeck',
          version: ANKICONNECT_VERSION,
          params: { deck: targetDeck },
        })

        const notesToAdd = notes.map((note) => ({
          deckName: targetDeck,
          modelName,
          fields: getFieldsForNote(note),
        }))

        const canAdd = await invokeAnkiConnect<boolean[]>(api, {
          action: 'canAddNotes',
          version: ANKICONNECT_VERSION,
          params: { notes: notesToAdd },
        })

        const filteredNotesToAdd = notesToAdd.filter((_, i) => canAdd[i])
        const skippedNotesCount = notesToAdd.length - filteredNotesToAdd.length

        if (filteredNotesToAdd.length > 0) {
          await invokeAnkiConnect<number[]>(api, {
            action: 'addNotes',
            version: ANKICONNECT_VERSION,
            params: { notes: filteredNotesToAdd },
          })
        }

        const addedCount = filteredNotesToAdd.length
        const message =
          addedCount > 0
            ? `Added ${addedCount} card${pluralSuffix(addedCount)} to ${targetDeck}${skippedNotesCount > 0 ? ` (${skippedNotesCount} already in deck)` : ''}`
            : `All ${notesToAdd.length} card${pluralSuffix(notesToAdd.length)} already in ${targetDeck}`

        enqueueSnackbar(message)
      } catch (err) {
        const message = await getApiErrorMessage(
          err,
          'Failed to add cards to Anki'
        )
        const displayMessage = isAnkiConnectionError(message)
          ? ANKI_CONNECTION_ERROR_MESSAGE
          : message
        setError(displayMessage)
        enqueueErrorSnackbar(displayMessage)
        if (isAnkiConnectionError(message)) ankiContext?.onConnectionError()
        throw err
      } finally {
        setIsAdding(false)
      }
    },
    [api, enqueueSnackbar, enqueueErrorSnackbar, ankiContext]
  )

  const getDeckNames = useCallback(async (): Promise<string[]> => {
    return invokeAnkiConnect<string[]>(api, {
      action: 'deckNames',
      version: ANKICONNECT_VERSION,
    })
  }, [api])

  const clearError = useCallback(() => setError(null), [])

  return {
    addToAnki,
    getDeckNames,
    isAddingToAnki: isAdding,
    error,
    clearError,
  }
}
