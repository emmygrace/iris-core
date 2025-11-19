/**
 * Offline mode support with cached data
 */

import { ApiCache } from './cache';
import type { EphemerisResponse } from '../types/ephemeris_types';
import type { RenderRequest } from './render';

export interface OfflineMode {
  isOnline(): boolean;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getCachedResponse(request: RenderRequest): EphemerisResponse | null;
  setCachedResponse(request: RenderRequest, response: EphemerisResponse): void;
  clearCache(): void;
}

/**
 * Create offline mode manager
 */
export function createOfflineMode(cache: ApiCache): OfflineMode {
  let offlineEnabled = false;

  // Detect online/offline status
  const isOnline = (): boolean => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // Assume online if we can't detect
  };

  return {
    isOnline,
    enable() {
      offlineEnabled = true;
    },
    disable() {
      offlineEnabled = false;
    },
    isEnabled() {
      return offlineEnabled;
    },
    getCachedResponse(request: RenderRequest): EphemerisResponse | null {
      // Try to get from cache
      const cached = cache.get('POST', '/render', request);
      return cached as EphemerisResponse | null;
    },
    setCachedResponse(request: RenderRequest, response: EphemerisResponse): void {
      // Store in cache
      cache.set('POST', '/render', request, response);
    },
    clearCache() {
      cache.clear();
    },
  };
}

