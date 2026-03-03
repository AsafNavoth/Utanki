import axios from 'axios'
import { getErrorMessage } from './commonStringUtils'

const ANKI_CONNECTION_ERROR_CODE = 'ANKI_CONNECTION'

const getErrorCode = (responseData: object): string | undefined => {
  const errorCodeValue =
    Object.getOwnPropertyDescriptor(responseData, 'errorCode')?.value

  return typeof errorCodeValue === 'string' ? errorCodeValue : undefined
}

// Detect Anki connection errors via structured backend response or network failure.
export const isAnkiConnectionError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const data = error.response?.data

  if (data && typeof data === 'object') {
    const code = getErrorCode(data)

    if (code !== undefined) return code === ANKI_CONNECTION_ERROR_CODE
  }

  return error.code === 'ERR_NETWORK'
}

// Extract the API error message from an error, handling both JSON and Blob
// response bodies (e.g. when responseType: 'blob' is used).
export const getApiErrorMessage = async (
  error: unknown,
  fallback = 'An error occurred'
): Promise<string> => {
  const defaultMessage = getErrorMessage(error, fallback)

  if (!axios.isAxiosError(error) || !error.response?.data) return defaultMessage

  const data = error.response.data

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
