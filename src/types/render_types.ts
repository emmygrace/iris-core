/**
 * TypeScript types for RenderResponse and related DTOs
 * Generated from backend/app/schemas/render_schemas.py
 */

// Import shared types from types.ts
import type { Subject, ChartSettings, Location } from './types';
import type { VedicPayload } from './ephemeris_types';

// Re-export Location for convenience
export type { Location } from './types';

// ChartInstanceSummary
export interface ChartInstanceSummary {
  id: string;
  chartDefinitionId: string;
  title: string;
  description?: string | null;
  ownerUserId: string;
  subjects: Subject[];
  effectiveDateTimes: Record<string, string>;
}

// CoordinateSystemDTO
export type SignName =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface ZeroPoint {
  type: 'zodiac';
  signStart: SignName;
  offsetDegrees: number;
}

export interface CoordinateSystemDTO {
  angleUnit: 'degrees';
  angleRange: [number, number];
  direction: 'cw' | 'ccw';
  zeroPoint: ZeroPoint;
}

// Layers
export interface PlanetPosition {
  lon: number;
  lat: number;
  speedLon?: number | null;
  retrograde?: boolean | null;
}

export interface HousePositions {
  system: string;
  cusps: Record<string, number>; // "1".."12"
  angles: Record<string, number>; // asc, mc, ic, dc
}

export interface LayerPositions {
  planets: Record<string, PlanetPosition>;
  houses?: HousePositions | null;
}

export interface LayerDTO {
  id: string;
  label: string;
  kind: string; // "natal", "transit", "progressed", etc.
  subjectId?: string | null;
  dateTime: string; // ISO datetime string
  location?: Location | null;
  positions: LayerPositions;
}

// Aspects
export type AspectObjectType = 'planet' | 'angle' | 'houseCusp' | 'point';

export interface AspectObjectRef {
  layerId: string;
  objectType: AspectObjectType;
  objectId: string; // "sun", "moon", "asc", "1", etc.
}

export interface AspectCore {
  type: string; // "conjunction", "trine", ...
  exactAngle: number;
  orb: number;
  isApplying: boolean;
  isExact: boolean;
}

export interface AspectMetrics {
  strength?: number | null; // 0..1
  isMajor?: boolean | null;
}

export interface AspectPairDTO {
  id: string;
  from: AspectObjectRef; // Note: backend uses "from_" with alias "from"
  to: AspectObjectRef;
  aspect: AspectCore;
  metrics?: AspectMetrics | null;
}

export interface AspectSetDTO {
  id: string;
  label: string;
  kind: 'intra_layer' | 'inter_layer';
  layerIds: string[];
  pairs: AspectPairDTO[];
}

export interface AspectsDTO {
  sets: Record<string, AspectSetDTO>;
}

// Wheel and Rings
export interface RadiusBand {
  inner: number;
  outer: number;
}

// Ring Items
export interface SignRingItem {
  id: string;
  kind: 'sign';
  index?: number | null;
  label: string;
  glyph?: string | null;
  startLon: number;
  endLon: number;
}

export interface HouseRingItem {
  id: string;
  kind: 'houseCusp';
  houseIndex: number;
  lon: number;
}

export interface PlanetRingItem {
  id: string;
  kind: 'planet';
  planetId: string;
  layerId: string;
  lon: number;
  lat?: number | null;
  speedLon?: number | null;
  retrograde?: boolean | null;
  signIndex?: number | null;
  signDegree?: number | null;
  houseIndex?: number | null;
}

export interface AspectRingEndpoint {
  layerId: string;
  objectType: AspectObjectType;
  objectId: string;
  lon: number;
  ringId: string;
  itemId: string;
}

export interface AspectRingItem {
  id: string;
  kind: 'aspect';
  aspectId: string; // links to AspectPairDTO.id
  aspectType: string;
  orb: number;
  exactAngle: number;
  from: AspectRingEndpoint; // Note: backend uses "from_" with alias "from"
  to: AspectRingEndpoint;
}

export type RingItemDTO = SignRingItem | HouseRingItem | PlanetRingItem | AspectRingItem;

// Data Sources for Rings
export interface StaticZodiacSource {
  kind: 'static_zodiac';
}

export interface StaticNakshatraSource {
  kind: 'static_nakshatras';
}

export interface LayerHousesSource {
  kind: 'layer_houses';
  layerId: string;
}

export interface LayerPlanetsSource {
  kind: 'layer_planets';
  layerId: string;
}

export interface LayerVargaPlanetsSource {
  kind: 'layer_varga_planets';
  layerId: string;
  vargaId: string;
}

export interface AspectSetFilter {
  includeTypes?: string[] | null;
  minStrength?: number | null;
  onlyMajor?: boolean | null;
}

export interface AspectSetSource {
  kind: 'aspect_set';
  aspectSetId: string;
  filter?: AspectSetFilter | null;
}

export type RingDataSource =
  | StaticZodiacSource
  | StaticNakshatraSource
  | LayerHousesSource
  | LayerPlanetsSource
  | LayerVargaPlanetsSource
  | AspectSetSource;

// Ring Schema
export interface RingDTO {
  id: string;
  type: string; // "signs" | "houses" | "planets" | "aspects" | ...
  label: string;
  order: number;
  radius: RadiusBand;
  dataSource?: RingDataSource | null;
  items?: RingItemDTO[] | null;
}

export interface WheelDTO {
  id: string;
  name: string;
  description?: string | null;
  radius: RadiusBand;
  rings: RingDTO[];
}

// Top-Level Response
export interface RenderResponse {
  chartInstance: ChartInstanceSummary;
  settings: ChartSettings;
  coordinateSystem: CoordinateSystemDTO;
  layers: Record<string, LayerDTO>;
  aspects: AspectsDTO;
  wheel: WheelDTO;
  vedic?: VedicPayload | null;
}

// IndexesDTO - used by buildIndexes utility
export interface IndexesDTO {
  ringById: Record<string, RingDTO>;
  itemByRingAndId: Record<string, Record<string, RingItemDTO>>;
  aspectSetById: Record<string, AspectSetDTO>;
  aspectById: Record<string, AspectPairDTO>;
  itemsByLogicalId: Record<string, { ringId: string; itemId: string }[]>;
  aspectsByObjectLogicalId: Record<string, string[]>;
}

