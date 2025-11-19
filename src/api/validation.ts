/**
 * Client-side request validation before API calls
 */

import type { RenderRequest } from './render';
import type { Subject, ChartSettings } from '../types/types';

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate a Subject object
 */
function validateSubject(subject: unknown, index: number): asserts subject is Subject {
  if (!subject || typeof subject !== 'object') {
    throw new ValidationError(`Subject at index ${index} must be an object`, `subjects[${index}]`);
  }

  const subj = subject as Record<string, unknown>;

  if (typeof subj.id !== 'string' || !subj.id) {
    throw new ValidationError(
      `Subject at index ${index} must have a non-empty id`,
      `subjects[${index}].id`
    );
  }

  if (typeof subj.birthDateTime !== 'string' || !subj.birthDateTime) {
    throw new ValidationError(
      `Subject at index ${index} must have a valid birthDateTime`,
      `subjects[${index}].birthDateTime`
    );
  }

  // Validate date format (ISO 8601)
  if (isNaN(Date.parse(subj.birthDateTime))) {
    throw new ValidationError(
      `Subject at index ${index} has invalid birthDateTime format`,
      `subjects[${index}].birthDateTime`
    );
  }

  if (typeof subj.birthTimezone !== 'string' || !subj.birthTimezone) {
    throw new ValidationError(
      `Subject at index ${index} must have a valid birthTimezone`,
      `subjects[${index}].birthTimezone`
    );
  }

  if (!subj.location || typeof subj.location !== 'object') {
    throw new ValidationError(
      `Subject at index ${index} must have a location object`,
      `subjects[${index}].location`
    );
  }

  const location = subj.location as Record<string, unknown>;

  if (typeof location.lat !== 'number' || isNaN(location.lat)) {
    throw new ValidationError(
      `Subject at index ${index} location must have a valid lat`,
      `subjects[${index}].location.lat`
    );
  }

  if (location.lat < -90 || location.lat > 90) {
    throw new ValidationError(
      `Subject at index ${index} location lat must be between -90 and 90`,
      `subjects[${index}].location.lat`
    );
  }

  if (typeof location.lon !== 'number' || isNaN(location.lon)) {
    throw new ValidationError(
      `Subject at index ${index} location must have a valid lon`,
      `subjects[${index}].location.lon`
    );
  }

  if (location.lon < -180 || location.lon > 180) {
    throw new ValidationError(
      `Subject at index ${index} location lon must be between -180 and 180`,
      `subjects[${index}].location.lon`
    );
  }
}

/**
 * Validate ChartSettings
 */
function validateChartSettings(settings: unknown): asserts settings is ChartSettings {
  if (!settings || typeof settings !== 'object') {
    throw new ValidationError('settings must be an object', 'settings');
  }

  const s = settings as Record<string, unknown>;

  if (typeof s.zodiacType !== 'string' || !['tropical', 'sidereal'].includes(s.zodiacType)) {
    throw new ValidationError(
      'settings.zodiacType must be "tropical" or "sidereal"',
      'settings.zodiacType'
    );
  }

  if (typeof s.houseSystem !== 'string' || !s.houseSystem) {
    throw new ValidationError(
      'settings.houseSystem must be a non-empty string',
      'settings.houseSystem'
    );
  }

  if (!Array.isArray(s.includeObjects)) {
    throw new ValidationError(
      'settings.includeObjects must be an array',
      'settings.includeObjects'
    );
  }
}

/**
 * Validate RenderRequest
 */
export function validateRenderRequest(request: unknown): asserts request is RenderRequest {
  if (!request || typeof request !== 'object') {
    throw new ValidationError('Request must be an object');
  }

  const req = request as Record<string, unknown>;

  // Validate subjects
  if (!Array.isArray(req.subjects)) {
    throw new ValidationError('subjects must be an array', 'subjects');
  }

  if (req.subjects.length === 0) {
    throw new ValidationError('subjects array must not be empty', 'subjects');
  }

  req.subjects.forEach((subject, index) => {
    validateSubject(subject, index);
  });

  // Validate settings
  if (!req.settings) {
    throw new ValidationError('settings is required', 'settings');
  }
  validateChartSettings(req.settings);

  // Validate layer_config
  if (!req.layer_config || typeof req.layer_config !== 'object') {
    throw new ValidationError('layer_config must be an object', 'layer_config');
  }

  const layerConfig = req.layer_config as Record<string, unknown>;
  if (Object.keys(layerConfig).length === 0) {
    throw new ValidationError('layer_config must not be empty', 'layer_config');
  }

  // Validate each layer
  for (const [layerId, layer] of Object.entries(layerConfig)) {
    if (!layer || typeof layer !== 'object') {
      throw new ValidationError(
        `layer_config[${layerId}] must be an object`,
        `layer_config[${layerId}]`
      );
    }

    const layerObj = layer as Record<string, unknown>;

    if (!['natal', 'transit', 'progressed'].includes(layerObj.kind as string)) {
      throw new ValidationError(
        `layer_config[${layerId}].kind must be "natal", "transit", or "progressed"`,
        `layer_config[${layerId}].kind`
      );
    }
  }
}

