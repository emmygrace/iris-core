/**
 * Convert EphemerisResponse to RenderResponse
 * This function calculates aspects and assembles the wheel client-side
 */

import type { EphemerisResponse, LayerResponse } from '../types/ephemeris_types';
import type { RenderResponse, LayerDTO, AspectsDTO, WheelDTO } from '../types/render_types';
import type { ChartSettings } from '../types/types';
import { aspectService } from './aspect-service';
import { WheelAssembler } from './wheel-assembler';
import type { WheelDefinition } from '@gaia-tools/aphrodite-shared/wheels';
import { getWheelDefinition } from '@gaia-tools/aphrodite-shared/wheels';

/**
 * Convert EphemerisResponse to RenderResponse by calculating aspects and assembling wheel
 */
export function convertEphemerisToRender(
  ephemerisResponse: EphemerisResponse,
  wheelConfig?: WheelDefinition
): RenderResponse {
  // Get wheel config (use provided or default)
  const wheel = wheelConfig || getWheelDefinition('Standard Natal Wheel');
  if (!wheel) {
    throw new Error('Wheel definition not found. Please provide a wheel config.');
  }

  // Convert layers to LayerPositions format for aspect calculation
  const positionsByLayer: Record<string, any> = {};
  for (const [layerId, layer] of Object.entries(ephemerisResponse.layers)) {
    // Convert to format expected by aspect service
    positionsByLayer[layerId] = {
      planets: layer.positions.planets,
      houses: layer.positions.houses || null,
    };
  }

  // Calculate aspects
  const aspectSettings = {
    orbSettings: {
      conjunction: ephemerisResponse.settings.orbSettings?.conjunction || 8.0,
      opposition: ephemerisResponse.settings.orbSettings?.opposition || 8.0,
      trine: ephemerisResponse.settings.orbSettings?.trine || 7.0,
      square: ephemerisResponse.settings.orbSettings?.square || 6.0,
      sextile: ephemerisResponse.settings.orbSettings?.sextile || 4.0,
    },
    includeObjects: ephemerisResponse.settings.includeObjects || [],
    onlyMajor: null,
  };

  const aspectSets = aspectService.computeAllAspectSets(positionsByLayer, aspectSettings);
  const vedicLayers = ephemerisResponse.vedic?.layers ?? null;

  // Assemble wheel
  const includeObjects = ephemerisResponse.settings.includeObjects || [];
  const assembledWheel = WheelAssembler.buildWheel(
    wheel,
    positionsByLayer,
    aspectSets,
    includeObjects,
    vedicLayers || undefined,
    ephemerisResponse.settings
  );

  // Convert aspect sets to AspectsDTO format
  const aspectsDTO: AspectsDTO = {
    sets: {},
  };

  for (const [setId, aspectSet] of Object.entries(aspectSets)) {
    aspectsDTO.sets[setId] = {
      id: aspectSet.id,
      label: aspectSet.label,
      kind: aspectSet.kind,
      layerIds: aspectSet.layerIds,
      pairs: aspectSet.pairs.map((pair) => ({
        id: `${pair.from.layerId}_${pair.from.objectId}_${pair.to.layerId}_${pair.to.objectId}_${pair.aspect.type}`,
        from: {
          layerId: pair.from.layerId,
          objectType: pair.from.objectType,
          objectId: pair.from.objectId,
        },
        to: {
          layerId: pair.to.layerId,
          objectType: pair.to.objectType,
          objectId: pair.to.objectId,
        },
        aspect: {
          type: pair.aspect.type,
          exactAngle: pair.aspect.exactAngle,
          orb: pair.aspect.orb,
          isApplying: pair.aspect.isApplying,
          isExact: pair.aspect.isExact,
        },
        metrics: null,
      })),
    };
  }

  // Convert layers to LayerDTO format
  const layersDTO: Record<string, LayerDTO> = {};
  for (const [layerId, layer] of Object.entries(ephemerisResponse.layers)) {
    layersDTO[layerId] = {
      id: layer.id,
      label: layer.kind.charAt(0).toUpperCase() + layer.kind.slice(1),
      kind: layer.kind,
      subjectId: null,
      dateTime: layer.dateTime,
      location: layer.location || null,
      positions: {
        planets: layer.positions.planets,
        houses: layer.positions.houses || null,
      },
    };
  }

  // Build RenderResponse
  return {
    chartInstance: {
      id: 'lite',
      chartDefinitionId: 'lite',
      title: 'Chart',
      description: null,
      ownerUserId: 'lite',
      subjects: [],
      effectiveDateTimes: Object.fromEntries(
        Object.entries(ephemerisResponse.layers).map(([id, layer]) => [id, layer.dateTime])
      ),
    },
    settings: ephemerisResponse.settings,
    coordinateSystem: {
      angleUnit: 'degrees',
      angleRange: [0.0, 360.0],
      direction: 'ccw',
      zeroPoint: {
        type: 'zodiac',
        signStart: 'aries',
        offsetDegrees: 0.0,
      },
    },
    layers: layersDTO,
    aspects: aspectsDTO,
    wheel: assembledWheel,
    vedic: ephemerisResponse.vedic || null,
  };
}

