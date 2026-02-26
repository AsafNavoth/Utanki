import { useCallback, useEffect, useState } from 'react'
import { useApi } from './useApi'

type UseAnkiExportParams = {
  payload: object | null
  filename: string
}

export const useAnkiExport = ({ payload, filename }: UseAnkiExportParams) => {
  const api = useApi()
  const [isExporting, setIsExporting] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBlob(null)
    setError(null)
  }, [payload])

  const prepare = useCallback(async () => {
    if (!payload) return
    setIsExporting(true)
    setError(null)
    setBlob(null)
    try {
      const response = await api.post('/api/lyrics/anki', payload, {
        responseType: 'blob',
      })
      setBlob(new Blob([response.data]))
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Export failed'
      if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = (err as { response?: { data?: unknown } }).response
        const responseData = errorResponse?.data
        if (responseData instanceof Blob) {
          try {
            const errorText = await responseData.text()
            const parsedError = JSON.parse(errorText) as { error?: string }
            if (parsedError.error) message = parsedError.error
          } catch {
            /* ignore */
          }
        }
      }
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }, [api, payload])

  const download = useCallback(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.href = objectUrl
    downloadAnchor.download = filename.replace(/\//g, '-')
    downloadAnchor.click()
    URL.revokeObjectURL(objectUrl)
  }, [blob, filename])

  return { prepare, download, blob, isExporting, error }
}
