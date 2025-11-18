/**
 * @gaia-tools/iris-core
 * 
 * Lightweight, framework-agnostic client bundle for Gaia astrological charting.
 * 
 * This package provides a unified interface for:
 * - API client for communicating with the backend
 * - Chart rendering with ChartWheel
 * - Client-side processing utilities (aspect calculation, wheel assembly, etc.)
 * 
 * @example
 * ```typescript
 * import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/iris-core';
 * 
 * // Create API client
 * const api = createApiClient('http://localhost:8000/api');
 * 
 * // Fetch ephemeris data
 * const ephemerisResponse = await api.render.render({
 *   subjects: [...],
 *   settings: {...},
 *   layer_config: {...}
 * });
 * 
 * // Convert to render data
 * const renderData = convertEphemerisToRender(ephemerisResponse);
 * const indexes = buildIndexes(renderData);
 * 
 * // Render chart
 * const container = document.getElementById('chart');
 * const chart = new ChartWheel(container, {
 *   renderData,
 *   indexes,
 *   width: 800,
 *   height: 800
 * });
 * ```
 */

// Export API client
export { createApiClient, type IrisApiClient } from './api/client';

// Re-export ChartWheel from aphrodite
export { ChartWheel, type ChartWheelOptions, type Theme } from '@gaia-tools/aphrodite';

// Export utilities
export {
  convertEphemerisToRender,
  buildIndexes,
  buildRenderRequestFromResponse,
  WheelAssembler,
  aspectService,
  AspectService,
} from './utils';

// Export types from types directory
export type {
  RenderResponse,
  EphemerisResponse,
  IndexesDTO,
  RingItemDTO,
  RingDTO,
  AspectPairDTO,
  ChartSettings,
  Subject,
} from './types';

// Export RenderRequest from API
export type { RenderRequest } from './api/render';

export type {
  AspectSettings,
  AspectCore,
  AspectObjectRef,
  AspectPair,
  AspectSet,
} from './utils';

// Re-export config types from aphrodite
export type {
  VisualConfig,
  GlyphConfig,
} from '@gaia-tools/aphrodite';
