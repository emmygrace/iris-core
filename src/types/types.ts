/**
 * TypeScript types for the Gaia API client.
 * These types correspond to the backend API schemas.
 */

// Location type (used in Subject and LayerDTO)
export interface Location {
  name?: string;
  lat: number;
  lon: number;
}

// Chart Definition API types
export type Subject = {
  id: string;
  label: string;
  birthDateTime?: string;
  birthTimezone?: string;
  location?: Location;
};

export type ChartSettings = {
  zodiacType: 'tropical' | 'sidereal';
  ayanamsa?: string;
  houseSystem: string;
  orbSettings: {
    conjunction: number;
    opposition: number;
    trine: number;
    square: number;
    sextile: number;
  };
  includeObjects: string[];
};

export type ChartDefinitionCreate = {
  title: string;
  type: string;
  subjects: Subject[];
  default_settings: ChartSettings;
};

export type ChartDefinitionRecord = {
  id: string;
  owner_user_id: string;
  title: string;
  type: string;
  subjects: Subject[];
  default_settings: ChartSettings;
  created_at: string;
  updated_at: string;
};

// Chart Instance API types
export type ChartInstanceCreate = {
  chart_id: string;
  title: string;
  wheel_id: string;
  layer_config: Record<string, {
    kind: string;
    subjectId?: string;
    dateTimeSource: string;
    explicitDateTime?: string;
    location?: Record<string, any>;
  }>;
  settings_override?: Record<string, any>;
};

export type ChartInstanceUpdate = {
  title?: string;
  wheel_id?: string;
  layer_config?: Record<string, any>;
  settings_override?: Record<string, any>;
};

export type ChartInstanceRecord = {
  id: string;
  chart_id: string;
  owner_user_id: string;
  title: string;
  wheel_id: string;
  layer_config: Record<string, any>;
  settings_override: Record<string, any>;
  created_at: string;
  updated_at: string;
};

// Wheel API types
export type WheelRecord = {
  id: string;
  name: string;
  description?: string;
  ownerUserId?: string;
  config?: Record<string, any>;
};

export interface ChartRecord {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  chart_name: string;
  chart_type: string;
  iso_local: string;
  lat: number;
  lon: number;
  tzid: string;
  house_system: string;
  bodies: string[];
  aspects: string[];
  orb_deg: number;
  params: Record<string, any>;
  notes: string | null;
}

export interface ChartListResponse {
  items: ChartRecord[];
  total: number;
  page: number;
  page_size: number;
}

