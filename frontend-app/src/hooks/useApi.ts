import { useMemo } from 'react'
import axios, { type AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL

const createApiClient = (): AxiosInstance =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

export const useApi = () => useMemo(() => createApiClient(), [])
