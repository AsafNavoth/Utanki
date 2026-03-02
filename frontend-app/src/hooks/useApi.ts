import axios, { type AxiosInstance } from 'axios'
import { apiUrl } from '../env'

const createApiClient = (): AxiosInstance =>
  axios.create({
    baseURL: apiUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const apiClient = createApiClient()

export const useApi = () => apiClient
