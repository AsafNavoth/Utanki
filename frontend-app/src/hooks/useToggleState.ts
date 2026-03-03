import { useState, useCallback } from 'react'

export const useToggleState = <T>(
  optionA: T,
  optionB: T,
  initial: T = optionA
): [T, () => void] => {
  const [state, setState] = useState<T>(initial)

  const toggleState = useCallback(() => {
    setState((prev) => (prev === optionA ? optionB : optionA))
  }, [optionA, optionB])

  return [state, toggleState]
}
