export const apiUrl = import.meta.env.VITE_API_URL

export const maxLyricsChars = parseInt(
  import.meta.env.VITE_MAX_LYRICS_CHARS,
  10
)

export const excludedDecks: string[] =
  import.meta.env.VITE_ANKI_EXCLUDED_DECKS.split(',')
    .map((deckName) => deckName.trim())
    .filter(Boolean)
