import { useCallback, useRef, useState } from 'react'
import { getStorageItem, setStorageItem } from '../utils/storage'

type UseLocalStorageStateOptions<T> = {
  key: string
  defaultValue: T
  parse?: (value: string) => T | null
  serialize?: (value: T) => string
}

const identityParse = <T>(v: string): T => v as T
const defaultSerialize = (v: unknown): string => String(v)

export const useLocalStorageState = <T>(
  options: UseLocalStorageStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] => {
  const { key, defaultValue } = options
  const parse = options.parse ?? identityParse
  const serialize = options.serialize ?? defaultSerialize
  const serializeRef = useRef(serialize)
  serializeRef.current = serialize

  const [state, setState] = useState<T>(() =>
    getStorageItem(key, parse, defaultValue)
  )

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = value instanceof Function ? value(prev) : value

        setStorageItem(key, serializeRef.current(next))

        return next
      })
    },
    [key]
  )

  return [state, setValue]
}
