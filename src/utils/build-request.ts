/**
 * Helper to build RenderRequest from existing RenderResponse data
 * Used for transitioning to the new simplified endpoint
 */

import type { RenderResponse } from '../types/render_types';
import type { RenderRequest } from '../api/render';

/**
 * Build a RenderRequest from existing RenderResponse data
 * This allows us to re-render charts using the new simplified endpoint
 */
export function buildRenderRequestFromResponse(renderData: RenderResponse): RenderRequest {
  // Extract subjects from chartInstance
  const subjects = renderData.chartInstance.subjects || [];

  // Build layer_config from layers
  const layerConfig: Record<string, {
    kind: 'natal' | 'transit' | 'progressed';
    subjectId?: string | null;
    explicitDateTime?: string | null;
    location?: {
      name?: string | null;
      lat: number;
      lon: number;
    } | null;
  }> = {};
  for (const [layerId, layer] of Object.entries(renderData.layers)) {
    layerConfig[layerId] = {
      kind: layer.kind as 'natal' | 'transit' | 'progressed',
      subjectId: layer.subjectId || null,
      explicitDateTime: layer.dateTime || null,
      location: layer.location || null,
    };
  }

  // Build settings with overrides
  const settings = renderData.settings;

  return {
    subjects,
    settings,
    layer_config: layerConfig,
    settings_override: {},
  };
}

