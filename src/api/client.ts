import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RenderApi, createRenderApi } from './render';

export interface IrisApiClient {
  render: RenderApi;
}

export function createApiClient(
  baseURL: string = '/api',
  config?: AxiosRequestConfig
): IrisApiClient {
  const axiosInstance: AxiosInstance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...config?.headers,
    },
    ...config,
  });

  return {
    render: createRenderApi(axiosInstance),
  };
}

