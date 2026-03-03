export const getErrorMessage = (
  errOrMessage: unknown,
  fallback: string
): string => {
  if (typeof errOrMessage === 'string') return errOrMessage

  if (errOrMessage instanceof Error) return errOrMessage.message

  return fallback
}

export const ANKI_CONNECTION_ERROR_MESSAGE =
  'Cannot connect to Anki. Make sure Anki is running and AnkiConnect add-on is installed.'

export const getPluralSuffix = (count: number, suffix = 's'): string =>
  count === 1 ? '' : suffix

export const getTextWithoutHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const getTruncatedText = (text: string, maxLen: number): string =>
  text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`
