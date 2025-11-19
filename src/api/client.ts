import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { RenderApi, createRenderApi } from './render';
import { AstrocartographyApi, createAstrocartographyApi } from './astrocartography';
import { ApiCache, CacheOptions } from './cache';
import { createOfflineMode, OfflineMode } from './offline';

export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

export interface IrisApiClientConfig extends AxiosRequestConfig {
  retries?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Base delay in ms for exponential backoff (default: 1000)
  timeout?: number; // Request timeout in ms (default: 30000)
  enableRetry?: boolean; // Enable/disable retry logic (default: true)
  logLevel?: LogLevel; // Logging level (default: 'none')
  logger?: (level: LogLevel, message: string, data?: unknown) => void; // Custom logger function
  cache?: CacheOptions | false; // Cache configuration (default: disabled, set to object to enable)
  apiVersion?: string; // API version to use (e.g., 'v1', 'v2') - added to baseURL
  offlineMode?: boolean; // Enable offline mode (requires cache to be enabled) (default: false)
}

export interface IrisApiClient {
  render: RenderApi;
  astrocartography: AstrocartographyApi;
}

/**
 * Check if an error should be retried
 */
function shouldRetry(error: AxiosError, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;
  
  // Retry on network errors
  if (!error.response) return true;
  
  // Retry on 5xx server errors
  if (error.response.status >= 500) return true;
  
  // Retry on 429 (Too Many Requests)
  if (error.response.status === 429) return true;
  
  // Retry on 408 (Request Timeout)
  if (error.response.status === 408) return true;
  
  // Don't retry on 4xx client errors (except 429, 408)
  if (error.response.status >= 400 && error.response.status < 500) return false;
  
  return false;
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return exponentialDelay + jitter;
}

/**
 * Log a message if logging is enabled
 */
function log(level: LogLevel, message: string, data: unknown, config: IrisApiClientConfig): void {
  const logLevel = config.logLevel ?? 'none';
  const levels: LogLevel[] = ['none', 'error', 'warn', 'info', 'debug'];
  const currentLevelIndex = levels.indexOf(logLevel);
  const messageLevelIndex = levels.indexOf(level);
  
  if (messageLevelIndex <= currentLevelIndex && messageLevelIndex > 0) {
    if (config.logger) {
      config.logger(level, message, data);
    } else {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[IrisApiClient ${level.toUpperCase()}]`, message, data || '');
    }
  }
}

/**
 * Create axios interceptor for retry logic
 */
function createRetryInterceptor(axiosInstance: AxiosInstance, config: IrisApiClientConfig) {
  const maxRetries = config.retries ?? 3;
  const baseDelay = config.retryDelay ?? 1000;
  const enableRetry = config.enableRetry !== false;

  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & { __retryCount?: number };
      
      if (!enableRetry || !config) {
        return Promise.reject(error);
      }

      const retryCount = config.__retryCount ?? 0;

      if (shouldRetry(error, retryCount, maxRetries)) {
        config.__retryCount = retryCount + 1;
        
        const delay = calculateRetryDelay(retryCount, baseDelay);
        
        log('info', `Retrying request (attempt ${retryCount + 1}/${maxRetries}) after ${delay.toFixed(0)}ms`, {
          url: config.url,
          method: config.method,
          status: error.response?.status,
        }, config);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return axiosInstance(config);
      }

      // Enhance error message with retry information
      if (retryCount > 0) {
        const enhancedError = new Error(
          `Request failed after ${retryCount + 1} attempts: ${error.message}`
        ) as AxiosError;
        enhancedError.config = error.config;
        enhancedError.request = error.request;
        enhancedError.response = error.response;
        enhancedError.isAxiosError = error.isAxiosError;
        return Promise.reject(enhancedError);
      }

      return Promise.reject(error);
    }
  );
}

export function createApiClient(
  baseURL: string = '/api',
  config?: IrisApiClientConfig
): IrisApiClient {
  // Add API version to baseURL if specified
  let finalBaseURL = baseURL;
  if (config?.apiVersion) {
    // Ensure baseURL ends with / and version doesn't start with /
    const version = config.apiVersion.startsWith('/') ? config.apiVersion.slice(1) : config.apiVersion;
    finalBaseURL = baseURL.endsWith('/') ? `${baseURL}${version}` : `${baseURL}/${version}`;
  }

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: finalBaseURL,
    timeout: config?.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      // Add API version header if specified
      ...(config?.apiVersion ? { 'X-API-Version': config.apiVersion } : {}),
      ...config?.headers,
    },
    ...config,
  });

  // Set up caching if enabled
  const cache = config?.cache !== false && config?.cache
    ? new ApiCache(config.cache)
    : config?.cache === false
    ? null
    : null;

  // Set up offline mode if enabled (requires cache)
  const offlineMode = config?.offlineMode && cache
    ? createOfflineMode(cache)
    : null;

  // Add retry interceptor
  createRetryInterceptor(axiosInstance, config ?? {});

  // Add request interceptor for caching and logging
  axiosInstance.interceptors.request.use(
    (requestConfig) => {
      // Check cache for GET requests
      if (cache && requestConfig.method?.toLowerCase() === 'get') {
        const cached = cache.get(
          requestConfig.method,
          requestConfig.url || '',
          requestConfig.params
        );
        if (cached) {
          log('debug', `Cache hit for ${requestConfig.url}`, {}, config ?? {});
          // Return cached response as a resolved promise
          return Promise.reject({
            __cached: true,
            data: cached,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: requestConfig,
          } as AxiosResponse);
        }
      }

      log('debug', `Making ${requestConfig.method?.toUpperCase()} request to ${requestConfig.url}`, {
        method: requestConfig.method,
        url: requestConfig.url,
        data: requestConfig.data,
      }, config ?? {});
      return requestConfig;
    },
    (error) => {
      log('error', 'Request setup failed', error, config ?? {});
      return Promise.reject(error);
    }
  );

  // Handle cached responses
  axiosInstance.interceptors.response.use(
    (response) => {
      // Check if this is a cached response
      if ((response as unknown as { __cached?: boolean }).__cached) {
        return response;
      }

      // Cache successful GET responses
      if (cache && response.config.method?.toLowerCase() === 'get') {
        cache.set(
          response.config.method,
          response.config.url || '',
          response.config.params,
          response.data
        );
      }

      log('debug', `Received response from ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
      }, config ?? {});
      return response;
    },
    (error: AxiosError | { __cached?: boolean; data: unknown; config: AxiosRequestConfig }) => {
      // Handle cached responses
      if ((error as { __cached?: boolean }).__cached) {
        return Promise.resolve(error as AxiosResponse);
      }

      const axiosError = error as AxiosError;
      log('error', 'Request failed', {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        message: axiosError.message,
      }, config ?? {});
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const statusText = error.response.statusText;
        const data = error.response.data;
        
        const message = `API Error ${status} ${statusText}: ${
          typeof data === 'object' && data !== null && 'detail' in data
            ? JSON.stringify(data.detail)
            : typeof data === 'string'
            ? data
            : 'Unknown error'
        }`;
        
        const enhancedError = new Error(message) as AxiosError;
        enhancedError.config = error.config;
        enhancedError.request = error.request;
        enhancedError.response = error.response;
        enhancedError.isAxiosError = error.isAxiosError;
        return Promise.reject(enhancedError);
      } else if (error.request) {
        // Request was made but no response received
        const enhancedError = new Error(
          `Network error: No response received from server. ${error.message}`
        ) as AxiosError;
        enhancedError.config = error.config;
        enhancedError.request = error.request;
        enhancedError.isAxiosError = error.isAxiosError;
        return Promise.reject(enhancedError);
      } else {
        // Error setting up the request
        const enhancedError = new Error(
          `Request setup error: ${error.message}`
        ) as AxiosError;
        enhancedError.config = error.config;
        enhancedError.isAxiosError = error.isAxiosError;
        return Promise.reject(enhancedError);
      }
    }
  );

  return {
    render: createRenderApi(axiosInstance, {
      validateRequests: true,
      offlineMode: offlineMode ?? undefined,
    }),
    astrocartography: createAstrocartographyApi(axiosInstance),
  };
}

