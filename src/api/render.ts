/**
 * Direct render API - simplified endpoint that returns only ephemeris positions
 */

import { AxiosInstance } from 'axios';
import type { EphemerisResponse } from '../types/ephemeris_types';
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
}

export function createRenderApi(axios: AxiosInstance): RenderApi {
  return {
    async render(request) {
      const response = await axios.post<EphemerisResponse>('/render', request);
      return response.data;
    },
  };
}

