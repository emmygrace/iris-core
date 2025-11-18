import type { ChartSettings, Location } from './types';
import type { LayerPositions } from './ephemeris_types';

export type AstroAngle = 'asc' | 'mc' | 'dc' | 'ic';

export interface PlanetaryLinesRequest {
  dateTime: string;
  settings: ChartSettings;
  planetIds?: string[];
  angles?: AstroAngle[];
  resolution?: number;
  tolerance?: number;
}

export type GeoJSONGeometry = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

export interface PlanetaryLineFeature {
  type: 'Feature';
  properties: {
    planet: string;
    angle: AstroAngle;
    [key: string]: unknown;
  };
  geometry: GeoJSONGeometry;
}

export interface PlanetaryLinesResponse {
  type: 'FeatureCollection';
  features: PlanetaryLineFeature[];
}

export interface RelocationRequest {
  dateTime: string;
  settings: ChartSettings;
  newLocation: Location;
  positions: LayerPositions;
}

export interface RelocationResponse {
  dateTime: string;
  location: Location;
  positions: LayerPositions;
}

