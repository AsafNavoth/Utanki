import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
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

export const useReactQueryMutation = <TData = unknown, TVariables = unknown>(
  url: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post',
  options?: UseMutationOptions<TData, Error, TVariables>
) => {
  const api = useApi()

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      if (method === 'delete') {
        const { data } = await api.delete<TData>(
          url,
          variables as AxiosRequestConfig
        )

        return data
      }

      const { data } = await api[method]<TData>(url, variables as object)

      return data
    },
    ...options,
  })
}
