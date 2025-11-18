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

export interface NakshatraPlacement {
  objectId: string;
  longitude: number;
  nakshatraId: string;
  nakshatraName: string;
  startDegree: number;
  endDegree: number;
  lord: string;
  pada: number;
  padaFraction: number;
}

export interface NakshatraLayer {
  layerId: string;
  placements: Record<string, NakshatraPlacement>;
}

export interface VargaPlanetPosition {
  lon: number;
  lat?: number | null;
  retrograde?: boolean | null;
}

export interface VargaLayer {
  baseLayerId: string;
  vargaId: string;
  label: string;
  planets: Record<string, VargaPlanetPosition>;
}

export interface VedicLayerData {
  layerId: string;
  nakshatras?: NakshatraLayer | null;
  vargas?: Record<string, VargaLayer>;
  yogas?: Array<Record<string, string>> | null;
}

export type DashaLevel = 'mahadasha' | 'antardasha' | 'pratyantardasha';

export interface DashaPeriod {
  planet: string;
  start: string;
  end: string;
  durationDays: number;
  level: DashaLevel;
  children?: DashaPeriod[];
}

export interface VimshottariResponse {
  system: string;
  depth: DashaLevel;
  birthDateTime: string;
  periods: DashaPeriod[];
}

export interface VedicPayload {
  layers: Record<string, VedicLayerData>;
  dashas?: VimshottariResponse | null;
}

// Simplified response - only ephemeris positions and settings
export interface EphemerisResponse {
  layers: Record<string, LayerResponse>;
  settings: ChartSettings;
  vedic?: VedicPayload | null;
}

// Export Location type for convenience
export type { Location } from './types';

