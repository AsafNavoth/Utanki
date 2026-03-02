import axios from 'axios'
import { getErrorMessage } from './commonStringUtils'

const ANKI_CONNECTION_ERROR_CODE = 'ANKI_CONNECTION'

const getErrorCode = (obj: object): string | undefined => {
  const val = Object.getOwnPropertyDescriptor(obj, 'errorCode')?.value

  return typeof val === 'string' ? val : undefined
}

// Detect Anki connection errors via structured backend response or network failure.
export const isAnkiConnectionError = (err: unknown): boolean => {
  if (!axios.isAxiosError(err)) return false
  const data = err.response?.data
  if (data && typeof data === 'object') {
    const code = getErrorCode(data)
    if (code !== undefined) return code === ANKI_CONNECTION_ERROR_CODE
  }

  return err.code === 'ERR_NETWORK'
}

// Extract the API error message from an error, handling both JSON and Blob
// response bodies (e.g. when responseType: 'blob' is used).
export const getApiErrorMessage = async (
  err: unknown,
  fallback = 'An error occurred'
): Promise<string> => {
  const defaultMessage = getErrorMessage(err, fallback)
  if (!axios.isAxiosError(err) || !err.response?.data) return defaultMessage

  const data = err.response.data

  if (typeof data === 'object' && data !== null && 'error' in data) {
    const errorVal = Object.getOwnPropertyDescriptor(data, 'error')?.value

    return typeof errorVal === 'string' ? errorVal : defaultMessage
  }

  if (data instanceof Blob) {
    try {
      const errorText = await data.text()
      const parsed: unknown = JSON.parse(errorText)
      if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
        const errorVal = Object.getOwnPropertyDescriptor(parsed, 'error')?.value

        return typeof errorVal === 'string' ? errorVal : defaultMessage
      }

      return defaultMessage
    } catch {
      return defaultMessage
    }
  }

  return defaultMessage
}
