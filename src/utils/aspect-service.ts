/**
 * Client-side aspect calculation service
 * Ported from Python app/services/aspect_service.py
 */

import type { LayerPositions, PlanetPosition } from '../types/render_types';

// Aspect definitions - ordered by frequency for early exit optimization
const ASPECT_ANGLES: readonly { name: string; angle: number }[] = [
  { name: 'conjunction', angle: 0 },
  { name: 'opposition', angle: 180 },
  { name: 'trine', angle: 120 },
  { name: 'square', angle: 90 },
  { name: 'sextile', angle: 60 },
] as const;

// Create lookup map for quick access
const ASPECT_ANGLES_MAP: Record<string, number> = Object.fromEntries(
  ASPECT_ANGLES.map(a => [a.name, a.angle])
);

export interface AspectSettings {
  orbSettings: Record<string, number>; // aspect_type -> orb in degrees
  includeObjects: string[];
  onlyMajor?: boolean | null;
}

export interface AspectCore {
  type: string; // "conjunction", "trine", etc.
  exactAngle: number;
  orb: number;
  isApplying: boolean;
  isExact: boolean;
}

export interface AspectObjectRef {
  layerId: string;
  objectType: 'planet' | 'angle' | 'houseCusp' | 'point';
  objectId: string;
}

export interface AspectPair {
  from: AspectObjectRef;
  to: AspectObjectRef;
  aspect: AspectCore;
}

export interface AspectSet {
  id: string;
  label: string;
  kind: 'intra_layer' | 'inter_layer';
  layerIds: string[];
  pairs: AspectPair[];
}

export class AspectService {
  /**
   * Compute aspects within a single layer.
   */
  computeIntraLayerAspects(
    layerId: string,
    positions: LayerPositions,
    settings: AspectSettings
  ): AspectSet {
    const pairs: AspectPair[] = [];
    const planets = positions.planets || {};

    let planetIds = Object.keys(planets);
    const orbSettings = settings.orbSettings || {};
    const includeObjects = settings.includeObjects || [];

    // Filter to included objects - use Set for O(1) lookup
    if (includeObjects.length > 0) {
      const includeSet = new Set(includeObjects);
      planetIds = planetIds.filter((pid) => includeSet.has(pid));
    }

    // Early exit if not enough planets
    if (planetIds.length < 2) {
      return {
        id: layerId,
        label: `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} Aspects`,
        kind: 'intra_layer',
        layerIds: [layerId],
        pairs: [],
      };
    }

    // Calculate aspects between all planet pairs
    for (let i = 0; i < planetIds.length; i++) {
      for (let j = i + 1; j < planetIds.length; j++) {
        const p1Id = planetIds[i];
        const p2Id = planetIds[j];

        const p1Pos = planets[p1Id];
        const p2Pos = planets[p2Id];

        const aspect = this.calculateAspect(
          p1Pos.lon,
          p2Pos.lon,
          p1Pos.speedLon || 0.0,
          p2Pos.speedLon || 0.0,
          orbSettings
        );

        if (aspect) {
          pairs.push({
            from: {
              layerId,
              objectType: 'planet',
              objectId: p1Id,
            },
            to: {
              layerId,
              objectType: 'planet',
              objectId: p2Id,
            },
            aspect,
          });
        }
      }
    }

    return {
      id: layerId,
      label: `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} Aspects`,
      kind: 'intra_layer',
      layerIds: [layerId],
      pairs,
    };
  }

  /**
   * Compute aspects between two layers.
   */
  computeInterLayerAspects(
    layerIdA: string,
    layerIdB: string,
    positionsA: LayerPositions,
    positionsB: LayerPositions,
    settings: AspectSettings
  ): AspectSet {
    const pairs: AspectPair[] = [];
    const planetsA = positionsA.planets || {};
    const planetsB = positionsB.planets || {};

    const orbSettings = settings.orbSettings || {};
    const includeObjects = settings.includeObjects || [];

    let planetIdsA = Object.keys(planetsA);
    let planetIdsB = Object.keys(planetsB);

    // Filter to included objects - use Set for O(1) lookup
    if (includeObjects.length > 0) {
      const includeSet = new Set(includeObjects);
      planetIdsA = planetIdsA.filter((pid) => includeSet.has(pid));
      planetIdsB = planetIdsB.filter((pid) => includeSet.has(pid));
    }

    // Early exit if no planets in either layer
    if (planetIdsA.length === 0 || planetIdsB.length === 0) {
      const aspectSetId = `${layerIdA}_${layerIdB}`;
      return {
        id: aspectSetId,
        label: `${layerIdA.charAt(0).toUpperCase() + layerIdA.slice(1)} - ${layerIdB.charAt(0).toUpperCase() + layerIdB.slice(1)} Aspects`,
        kind: 'inter_layer',
        layerIds: [layerIdA, layerIdB],
        pairs: [],
      };
    }

    // Calculate aspects between all planet pairs across layers
    for (const p1Id of planetIdsA) {
      for (const p2Id of planetIdsB) {
        // Skip if same planet name
        if (p1Id === p2Id) {
          continue;
        }

        const p1Pos = planetsA[p1Id];
        const p2Pos = planetsB[p2Id];

        const aspect = this.calculateAspect(
          p1Pos.lon,
          p2Pos.lon,
          p1Pos.speedLon || 0.0,
          p2Pos.speedLon || 0.0,
          orbSettings
        );

        if (aspect) {
          pairs.push({
            from: {
              layerId: layerIdA,
              objectType: 'planet',
              objectId: p1Id,
            },
            to: {
              layerId: layerIdB,
              objectType: 'planet',
              objectId: p2Id,
            },
            aspect,
          });
        }
      }
    }

    const aspectSetId = `${layerIdA}_${layerIdB}`;
    return {
      id: aspectSetId,
      label: `${layerIdA.charAt(0).toUpperCase() + layerIdA.slice(1)} - ${layerIdB.charAt(0).toUpperCase() + layerIdB.slice(1)} Aspects`,
      kind: 'inter_layer',
      layerIds: [layerIdA, layerIdB],
      pairs,
    };
  }

  /**
   * Compute all aspect sets for given layers.
   */
  computeAllAspectSets(
    layers: Record<string, LayerPositions>,
    settings: AspectSettings
  ): Record<string, AspectSet> {
    const aspectSets: Record<string, AspectSet> = {};

    // Intra-layer aspects
    for (const [layerId, positions] of Object.entries(layers)) {
      const aspectSet = this.computeIntraLayerAspects(layerId, positions, settings);
      aspectSets[layerId] = aspectSet;
    }

    // Inter-layer aspects
    const layerIds = Object.keys(layers);
    for (let i = 0; i < layerIds.length; i++) {
      for (let j = i + 1; j < layerIds.length; j++) {
        const layerIdA = layerIds[i];
        const layerIdB = layerIds[j];
        const aspectSet = this.computeInterLayerAspects(
          layerIdA,
          layerIdB,
          layers[layerIdA],
          layers[layerIdB],
          settings
        );
        aspectSets[aspectSet.id] = aspectSet;
      }
    }

    return aspectSets;
  }

  /**
   * Calculate aspect between two longitudes using planet speeds.
   * Optimized with early exit and reduced calculations.
   */
  private calculateAspect(
    lon1: number,
    lon2: number,
    speed1: number,
    speed2: number,
    orbSettings: Record<string, number>
  ): AspectCore | null {
    // Calculate angle difference (normalized to 0-180) - optimized
    const rawDiff = Math.abs(lon1 - lon2);
    const angleDiff = rawDiff > 180 ? 360 - rawDiff : rawDiff;

    // Early exit if angle is too large to be any aspect (with max orb)
    const maxOrb = Math.max(...Object.values(orbSettings), 8.0);
    if (angleDiff > 180 + maxOrb) {
      return null;
    }

    // Check each aspect type in order of frequency (most common first)
    for (const { name: aspectName, angle: aspectAngle } of ASPECT_ANGLES) {
      const orb = orbSettings[aspectName] ?? 8.0; // Default orb
      const orbValue = Math.abs(angleDiff - aspectAngle);

      if (orbValue <= orb) {
        // Determine if applying or separating (only calculate if aspect found)
        const isApplying = this.isAspectApplying(
          lon1,
          lon2,
          speed1,
          speed2,
          aspectAngle,
          angleDiff
        );
        const isExact = orbValue < 0.1; // Within 0.1 degrees is "exact"

        return {
          type: aspectName,
          exactAngle: aspectAngle,
          orb: orbValue,
          isApplying,
          isExact,
        };
      }
    }

    return null;
  }

  /**
   * Determine if an aspect is applying (approaching exact) or separating.
   * Optimized version with reduced calculations.
   *
   * An aspect is applying if the angular separation is decreasing toward the exact aspect angle.
   * We calculate the rate of change of the angular separation based on relative speeds.
   */
  private isAspectApplying(
    lon1: number,
    lon2: number,
    speed1: number,
    speed2: number,
    aspectAngle: number,
    currentAngle: number
  ): boolean {
    // Calculate relative speed (degrees per day)
    const relativeSpeed = speed1 - speed2;

    // If speeds are equal or very close, we can't determine direction reliably
    if (Math.abs(relativeSpeed) < 0.01) {
      // Default to applying if very close to exact aspect
      return currentAngle < aspectAngle + 0.5;
    }

    // Calculate the signed angular difference (considering direction)
    // This tells us which planet is "ahead" in the zodiac
    // Optimized normalization
    let signedDiff = lon1 - lon2;
    if (signedDiff > 180) {
      signedDiff -= 360;
    } else if (signedDiff < -180) {
      signedDiff += 360;
    }

    // Calculate the current distance from exact aspect
    const currentDistance = Math.abs(currentAngle - aspectAngle);

    // Project forward a small amount to see if we're getting closer to exact
    // Use a slightly larger time step for better performance
    const timeStep = 0.1; // Small time step (days) - increased for performance
    let futureSignedDiff = signedDiff + relativeSpeed * timeStep;

    // Normalize future difference - optimized
    if (futureSignedDiff > 180) {
      futureSignedDiff -= 360;
    } else if (futureSignedDiff < -180) {
      futureSignedDiff += 360;
    }

    // Calculate future angular separation
    const futureAngle = Math.abs(futureSignedDiff);

    // Calculate distances from exact aspect
    const futureDistance = Math.abs(futureAngle - aspectAngle);

    // Applying if we're moving closer to the exact aspect
    return futureDistance < currentDistance;
  }
}

// Export singleton instance
export const aspectService = new AspectService();

