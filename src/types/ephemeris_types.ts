/**
 * TypeScript types for EphemerisResponse (simplified backend response)
 * This is the new simplified response that only contains positions and settings
 */

import type { ChartSettings, Location } from './types';

// Planet position from ephemeris
export interface PlanetPosition {
  lon: number;
  lat: number;
  speedLon?: number | null;
  retrograde?: boolean | null;
}

// House positions from ephemeris
export interface HousePositions {
  system: string;
  cusps: Record<string, number>; // "1".."12"
  angles: Record<string, number>; // asc, mc, ic, dc
}

// Positions for a single layer
export interface LayerPositions {
  planets: Record<string, PlanetPosition>;
  houses?: HousePositions | null;
}

// Layer response with positions
export interface LayerResponse {
  id: string;
  kind: string; // "natal", "transit", "progressed"
  dateTime: string; // ISO datetime string
  location?: Location | null;
  positions: LayerPositions;
}

// Simplified response - only ephemeris positions and settings
export interface EphemerisResponse {
  layers: Record<string, LayerResponse>;
  settings: ChartSettings;
}

// Export Location type for convenience
export type { Location } from './types';

