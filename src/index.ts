/**
 * @gaia-tools/bundle-core
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
 * import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/bundle-core';
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

// Re-export API client
export { createApiClient, type ApiClient } from '@gaia-tools/coeus-api-client';

// Re-export ChartWheel from aphrodite-core
export { ChartWheel, type ChartWheelOptions, type Theme } from '@gaia-tools/aphrodite-core';

// Re-export utilities from coeus-api-client
export {
  convertEphemerisToRender,
  buildIndexes,
  buildRenderRequestFromResponse,
  WheelAssembler,
  aspectService,
  AspectService,
} from '@gaia-tools/coeus-api-client';

// Re-export types from coeus-api-client
export type {
  RenderResponse,
  RenderRequest,
  EphemerisResponse,
  IndexesDTO,
  RingItemDTO,
  RingDTO,
  AspectPairDTO,
  ChartSettings,
  Subject,
} from '@gaia-tools/coeus-api-client';

export type {
  AspectSettings,
  AspectCore,
  AspectObjectRef,
  AspectPair,
  AspectSet,
} from '@gaia-tools/coeus-api-client';

// Re-export config types from aphrodite-core
export type {
  VisualConfig,
  GlyphConfig,
} from '@gaia-tools/aphrodite-core';

