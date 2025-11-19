/**
 * Direct render API - simplified endpoint that returns only ephemeris positions
 */

import { AxiosInstance } from 'axios';
import type { EphemerisResponse, VimshottariResponse } from '../types/ephemeris_types';
import type { Subject, ChartSettings } from '../types/types';
import { validateRenderRequest } from './validation';
import type { OfflineMode } from './offline';

export interface LayerConfig {
  kind: 'natal' | 'transit' | 'progressed';
  subjectId?: string | null;
  explicitDateTime?: string | null;
  location?: {
    name?: string | null;
    lat: number;
    lon: number;
  } | null;
}

export interface RenderRequest {
  subjects: Subject[];
  settings: ChartSettings;
  layer_config: Record<string, LayerConfig>;
  settings_override?: Record<string, unknown>;
}

export interface RenderApi {
  /**
   * Get ephemeris positions for the requested layers.
   * Returns only positions and settings - no aspects or wheel data.
   */
  render(request: RenderRequest): Promise<EphemerisResponse>;
  /**
   * Convenience wrapper for /api/vedic/render.
   * Ensures Vedic overlays (nakshatras, dashas) are enabled server-side.
   */
  renderVedic(request: RenderRequest): Promise<EphemerisResponse>;
  /**
   * Fetch Vimshottari dashas for a given request payload.
   */
  dashas(request: RenderRequest): Promise<VimshottariResponse>;
}

export interface RenderApiOptions {
  validateRequests?: boolean; // Enable/disable request validation (default: true)
  offlineMode?: OfflineMode; // Offline mode manager for cached responses
}

export function createRenderApi(
  axios: AxiosInstance,
  options: RenderApiOptions = {}
): RenderApi {
  const validateRequests = options.validateRequests !== false;

  return {
    async render(request) {
      if (validateRequests) {
        validateRenderRequest(request);
      }

      // Check offline mode
      if (options.offlineMode?.isEnabled() && !options.offlineMode.isOnline()) {
        const cached = options.offlineMode.getCachedResponse(request);
        if (cached) {
          return cached;
        }
        throw new Error('Offline mode enabled and no cached response available');
      }

      try {
        const response = await axios.post<EphemerisResponse>('/render', request);
        
        // Cache response if offline mode is enabled
        if (options.offlineMode) {
          options.offlineMode.setCachedResponse(request, response.data);
        }
        
        return response.data;
      } catch (error) {
        // If request fails and offline mode is enabled, try cache
        if (options.offlineMode?.isEnabled()) {
          const cached = options.offlineMode.getCachedResponse(request);
          if (cached) {
            return cached;
          }
        }
        throw error;
      }
    },
    async renderVedic(request) {
      if (validateRequests) {
        validateRenderRequest(request);
      }
      const response = await axios.post<EphemerisResponse>('/vedic/render', request);
      return response.data;
    },
    async dashas(request) {
      if (validateRequests) {
        validateRenderRequest(request);
      }
      const response = await axios.post<VimshottariResponse>('/vedic/dashas', request);
      return response.data;
    },
  };
}

