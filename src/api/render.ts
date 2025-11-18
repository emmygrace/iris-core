/**
 * Direct render API - simplified endpoint that returns only ephemeris positions
 */

import { AxiosInstance } from 'axios';
import type { EphemerisResponse, VimshottariResponse } from '../types/ephemeris_types';
import type { Subject, ChartSettings } from '../types/types';

export interface RenderRequest {
  subjects: Subject[];
  settings: ChartSettings;
  layer_config: Record<string, {
    kind: 'natal' | 'transit' | 'progressed';
    subjectId?: string | null;
    explicitDateTime?: string | null;
    location?: {
      name?: string | null;
      lat: number;
      lon: number;
    } | null;
  }>;
  settings_override?: Record<string, any>;
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

export function createRenderApi(axios: AxiosInstance): RenderApi {
  return {
    async render(request) {
      const response = await axios.post<EphemerisResponse>('/render', request);
      return response.data;
    },
    async renderVedic(request) {
      const response = await axios.post<EphemerisResponse>('/vedic/render', request);
      return response.data;
    },
    async dashas(request) {
      const response = await axios.post<VimshottariResponse>('/vedic/dashas', request);
      return response.data;
    },
  };
}

