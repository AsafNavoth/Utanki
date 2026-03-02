import {
  useQuery,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query'
import type { AxiosRequestConfig } from 'axios'
import { useApi } from './useApi'

type UseReactQueryParams<TData> = {
  queryKey: QueryKey
  url: string
  config?: AxiosRequestConfig
} & Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>

export const useReactQuery = <TData = unknown>({
  queryKey,
  url,
  config,
  ...options
}: UseReactQueryParams<TData>) => {
  const api = useApi()

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<TData>(url, config)

      return data
    },
    ...options,
  })
}
