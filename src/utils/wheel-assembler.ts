/**
 * Client-side wheel assembly service
 * Ported from Python app/domain/assemblers/wheel_assembler_lite.py
 */

import type {
  LayerPositions,
  PlanetPosition,
  HousePositions,
  WheelDTO,
  RingDTO,
  RadiusBand,
  SignRingItem,
  HouseRingItem,
  PlanetRingItem,
  AspectRingItem,
  AspectRingEndpoint,
  RingItemDTO,
  StaticZodiacSource,
  LayerHousesSource,
  LayerPlanetsSource,
  AspectSetSource,
  RingDataSource,
  AspectSetFilter,
} from '../types/render_types';
import type { AspectSet } from './aspect-service';
import type { RingDefinition, WheelDefinition } from '@gaia-tools/aphrodite-shared/wheels';
import type { VedicLayerData, VargaLayer } from '../types/ephemeris_types';
import type { ChartSettings } from '../types/types';
import { resolveCollisions, type CollisionConfig } from './collision-detection';

// Sign names and glyphs
const SIGNS: Array<[string, string]> = [
  ['aries', '♈'],
  ['taurus', '♉'],
  ['gemini', '♊'],
  ['cancer', '♋'],
  ['leo', '♌'],
  ['virgo', '♍'],
  ['libra', '♎'],
  ['scorpio', '♏'],
  ['sagittarius', '♐'],
  ['capricorn', '♑'],
  ['aquarius', '♒'],
  ['pisces', '♓'],
];

function getSignIndex(longitude: number): number {
  /**Get sign index (0-11) from longitude.*/
  let normalized = longitude % 360;
  if (normalized === 360) {
    normalized = 0;
  }
  return Math.floor(normalized / 30);
}

function getSignDegree(longitude: number): number {
  /**Get position within sign (0-30).*/
  return longitude % 30;
}

function getHouseIndex(planetLon: number, houses: Record<string, number>): number | null {
  /**Calculate which house a planet is in based on cusps.*/
  if (!houses || Object.keys(houses).length === 0) {
    return null;
  }

  let planetLonNorm = planetLon % 360;
  if (planetLonNorm < 0) {
    planetLonNorm += 360;
  }

  const houseCusps: Array<[number, number]> = [];
  for (const [houseNumStr, cuspLon] of Object.entries(houses)) {
    try {
      const houseNum = parseInt(houseNumStr, 10);
      if (houseNum >= 1 && houseNum <= 12) {
        let cuspNorm = cuspLon % 360;
        if (cuspNorm < 0) {
          cuspNorm += 360;
        }
        houseCusps.push([houseNum, cuspNorm]);
      }
    } catch {
      // Skip invalid house numbers
      continue;
    }
  }

  if (houseCusps.length === 0) {
    return null;
  }

  houseCusps.sort((a, b) => a[1] - b[1]);

  for (let i = 0; i < houseCusps.length; i++) {
    const [currentHouseNum, currentCusp] = houseCusps[i];
    const [nextHouseNum, nextCusp] = houseCusps[(i + 1) % houseCusps.length];

    if (nextCusp < currentCusp) {
      if (planetLonNorm >= currentCusp || planetLonNorm < nextCusp) {
        return currentHouseNum - 1;
      }
    } else {
      if (currentCusp <= planetLonNorm && planetLonNorm < nextCusp) {
        return currentHouseNum - 1;
      }
    }
  }

  return 0;
}

export class WheelAssembler {
  /**
   * Build a complete wheel DTO with resolved ring items.
   */
  static buildWheel(
    wheelConfig: WheelDefinition,
    positionsByLayer: Record<string, LayerPositions | any>,
    aspectSets: Record<string, AspectSet>,
    includeObjects?: string[] | null,
    vedicLayers?: Record<string, VedicLayerData> | null,
    settings?: ChartSettings
  ): WheelDTO {
    const rings = wheelConfig.rings || [];
    const ringDtos: RingDTO[] = [];

    for (const ringConfig of rings) {
      const ringDto = WheelAssembler.buildRing(
        ringConfig,
        positionsByLayer,
        aspectSets,
        ringDtos,
        includeObjects,
        vedicLayers || undefined,
        settings
      );
      ringDtos.push(ringDto);
    }

    // Determine wheel radius
    let innerRadius = 0.0;
    let outerRadius = 1.0;

    // Check if wheel config has explicit radius (not in WheelDefinition type, but could be in config)
    const config = wheelConfig.config as any;
    if (config?.radiusInner !== undefined && config?.radiusOuter !== undefined) {
      innerRadius = config.radiusInner;
      outerRadius = config.radiusOuter;
    } else {
      // Calculate from rings
      if (rings.length > 0) {
        innerRadius = Math.min(...rings.map((r) => r.radiusInner));
        outerRadius = Math.max(...rings.map((r) => r.radiusOuter));
      }
    }

    return {
      id: crypto.randomUUID(),
      name: wheelConfig.name,
      description: wheelConfig.description || null,
      radius: {
        inner: innerRadius,
        outer: outerRadius,
      },
      rings: ringDtos,
    };
  }

  /**
   * Build a single ring DTO with resolved items.
   */
  static buildRing(
    ringConfig: RingDefinition,
    positionsByLayer: Record<string, LayerPositions>,
    aspectSets: Record<string, AspectSet>,
    existingRings: RingDTO[],
    includeObjects?: string[] | null,
    vedicLayers?: Record<string, VedicLayerData>,
    settings?: ChartSettings
  ): RingDTO {
    const dataSource = ringConfig.dataSource;
    let items: RingItemDTO[] | null = null;
    const slug = ringConfig.slug;

    if (dataSource.kind === 'static_zodiac') {
      items = WheelAssembler.buildStaticZodiacItems(slug);
    } else if (dataSource.kind === 'static_nakshatras') {
      items = WheelAssembler.buildStaticNakshatraItems(slug);
    } else if (dataSource.kind === 'layer_houses') {
      const layerId = dataSource.layerId;
      if (layerId && layerId in positionsByLayer) {
        items = WheelAssembler.buildHouseItems(slug, layerId, positionsByLayer[layerId]);
      }
    } else if (dataSource.kind === 'layer_planets') {
      const layerId = dataSource.layerId;
      if (layerId && layerId in positionsByLayer) {
        const centerRadius = (ringConfig.radiusInner + ringConfig.radiusOuter) / 2;
        items = WheelAssembler.buildPlanetItems(
          slug,
          layerId,
          positionsByLayer[layerId],
          includeObjects,
          centerRadius,
          settings
        );
      }
    } else if (dataSource.kind === 'layer_varga_planets') {
      const layerId = dataSource.layerId;
      const vargaId = dataSource.vargaId;
      const vargaLayers = vedicLayers?.[layerId]?.vargas;
      if (vargaLayers && vargaId && vargaLayers[vargaId]) {
        items = WheelAssembler.buildVargaPlanetItems(
          slug,
          `${layerId}_${vargaId}`,
          vargaLayers[vargaId]
        );
      }
    } else if (dataSource.kind === 'aspect_set') {
      const aspectSetId = dataSource.aspectSetId;
      const filterConfig = dataSource.filter || {};
      if (aspectSetId && aspectSetId in aspectSets) {
        items = WheelAssembler.buildAspectItems(
          slug,
          aspectSets[aspectSetId],
          positionsByLayer,
          existingRings,
          filterConfig
        );
      }
    }

    // Convert data_source to typed model
    const typedDataSource = WheelAssembler.convertDataSource(dataSource);

    return {
      id: crypto.randomUUID(),
      type: ringConfig.type,
      label: ringConfig.label,
      order: ringConfig.orderIndex,
      radius: {
        inner: ringConfig.radiusInner,
        outer: ringConfig.radiusOuter,
      },
      dataSource: typedDataSource,
      items: items || null,
    };
  }

  /**
   * Build 12 sign items for static zodiac ring.
   */
  private static buildStaticZodiacItems(slug: string): SignRingItem[] {
  private static buildStaticNakshatraItems(slug: string): SignRingItem[] {
    const items: SignRingItem[] = [];
    const segmentSize = 360 / 27;
    const nakshatraNames = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
      'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
      'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
      'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
      'Uttara Bhadrapada', 'Revati',
    ];

    for (let i = 0; i < nakshatraNames.length; i++) {
      const startLon = i * segmentSize;
      const endLon = (i + 1) * segmentSize;
      items.push({
        id: `${slug}_nakshatra_${i}`,
        kind: 'sign',
        index: i,
        label: nakshatraNames[i],
        glyph: null,
        startLon,
        endLon,
      });
    }

    return items;
  }

    const items: SignRingItem[] = [];

    for (let i = 0; i < SIGNS.length; i++) {
      const [signName, glyph] = SIGNS[i];
      const startLon = i * 30.0;
      const endLon = (i + 1) * 30.0;

      items.push({
        id: `${slug}_sign_${signName}`,
        kind: 'sign',
        index: i,
        label: signName.charAt(0).toUpperCase() + signName.slice(1),
        glyph: glyph,
        startLon: startLon,
        endLon: endLon,
      });
    }

    return items;
  }

  /**
   * Build house cusp items from layer positions.
   */
  private static buildHouseItems(slug: string, layerId: string, positions: LayerPositions): HouseRingItem[] {
    const items: HouseRingItem[] = [];

    const houses = positions.houses;
    if (!houses || !houses.cusps) {
      return items;
    }

    const cusps = houses.cusps;
    for (const [houseNumStr, cuspLon] of Object.entries(cusps)) {
      const houseIndex = parseInt(houseNumStr, 10) - 1;

      items.push({
        id: `${slug}_house_${houseNumStr}`,
        kind: 'houseCusp',
        houseIndex: houseIndex,
        lon: cuspLon,
      });
    }

    return items;
  }

  /**
   * Build planet items from layer positions.
   */
  private static buildPlanetItems(
    slug: string,
    layerId: string,
    positions: LayerPositions,
    includeObjects?: string[] | null,
    radius?: number,
    settings?: ChartSettings
  ): PlanetRingItem[] {
    const items: PlanetRingItem[] = [];

    const planets = positions.planets || {};
    const houses = positions.houses;

    // Add planets
    for (const [planetId, planetPos] of Object.entries(planets)) {
      const lon = planetPos.lon;
      const signIndex = getSignIndex(lon);
      const signDegree = getSignDegree(lon);
      const houseIndex = houses?.cusps ? getHouseIndex(lon, houses.cusps) : null;

      items.push({
        id: `${slug}_${planetId}`,
        kind: 'planet',
        planetId: planetId,
        layerId: layerId,
        lon: lon,
        lat: planetPos.lat ?? null,
        speedLon: planetPos.speedLon ?? null,
        retrograde: planetPos.retrograde ?? null,
        signIndex: signIndex,
        signDegree: signDegree,
        houseIndex: houseIndex,
      });
    }

    // Add angles (asc, mc, ic, dc) from houses if requested
    if (houses?.angles) {
      const angles = houses.angles;
      const angleMap: Record<string, number | undefined> = {
        asc: angles.asc,
        mc: angles.mc,
        ic: angles.ic,
        dc: angles.dc,
      };

      for (const [angleId, lon] of Object.entries(angleMap)) {
        if (lon === undefined || lon === null) {
          continue;
        }

        if (includeObjects && !includeObjects.includes(angleId)) {
          continue;
        }

        const signIndex = getSignIndex(lon);
        const signDegree = getSignDegree(lon);
        const houseIndex = houses.cusps ? getHouseIndex(lon, houses.cusps) : null;

        items.push({
          id: `${slug}_${angleId}`,
          kind: 'planet',
          planetId: angleId,
          layerId: layerId,
          lon: lon,
          lat: null,
          speedLon: null,
          retrograde: null,
          signIndex: signIndex,
          signDegree: signDegree,
          houseIndex: houseIndex,
        });
      }
    }

    // Apply collision detection if enabled and radius is provided
    if (settings?.collisionDetection?.enabled && radius !== undefined && items.length > 0) {
      const collisionConfig: CollisionConfig = {
        enabled: settings.collisionDetection.enabled,
        radius: settings.collisionDetection.radius ?? 10,
        scale: settings.collisionDetection.scale ?? 1,
        debug: settings.collisionDetection.debug ?? false,
      };

      const resolvedItems = resolveCollisions(items, radius, collisionConfig);
      return resolvedItems;
    }

    return items;
  }

  /**
   * Build planet items from varga layer data.
   */
  private static buildVargaPlanetItems(
    slug: string,
    syntheticLayerId: string,
    vargaLayer: VargaLayer
  ): PlanetRingItem[] {
    const pseudoPositions: LayerPositions = {
      planets: {},
    };

    for (const [planetId, planetPos] of Object.entries(vargaLayer.planets)) {
      pseudoPositions.planets[planetId] = {
        lon: planetPos.lon,
        lat: planetPos.lat ?? 0,
        speedLon: 0,
        retrograde: planetPos.retrograde ?? false,
      };
    }

    return WheelAssembler.buildPlanetItems(slug, syntheticLayerId, pseudoPositions, undefined, undefined, undefined);
  }

  /**
   * Build aspect items linking to planet ring items.
   */
  private static buildAspectItems(
    slug: string,
    aspectSet: AspectSet,
    positionsByLayer: Record<string, LayerPositions>,
    existingRings: RingDTO[],
    filterConfig: Partial<AspectSetFilter>
  ): AspectRingItem[] {
    const items: AspectRingItem[] = [];

    // Find planet rings to link to
    const planetRingsByLayer: Record<string, RingDTO> = {};
    for (const existingRing of existingRings) {
      const ds = existingRing.dataSource;
      if (ds && ds.kind === 'layer_planets') {
        planetRingsByLayer[ds.layerId] = existingRing;
      }
    }

    // Apply filters
    const onlyMajor = filterConfig.onlyMajor || false;
    const includeTypes = filterConfig.includeTypes;

    for (const pair of aspectSet.pairs) {
      const aspectType = pair.aspect.type;

      if (includeTypes && !includeTypes.includes(aspectType)) {
        continue;
      }

      if (onlyMajor && !['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(aspectType)) {
        continue;
      }

      const fromRef = pair.from;
      const toRef = pair.to;

      const fromLayerId = fromRef.layerId;
      const toLayerId = toRef.layerId;

      const fromRing = planetRingsByLayer[fromLayerId];
      const toRing = planetRingsByLayer[toLayerId];

      if (!fromRing || !toRing) {
        continue;
      }

      const fromItem = (fromRing.items || []).find(
        (item): item is PlanetRingItem => item.kind === 'planet' && item.planetId === fromRef.objectId
      );
      const toItem = (toRing.items || []).find(
        (item): item is PlanetRingItem => item.kind === 'planet' && item.planetId === toRef.objectId
      );

      if (!fromItem || !toItem) {
        continue;
      }

      const aspectId = `${fromLayerId}_${fromRef.objectId}_${toLayerId}_${toRef.objectId}_${aspectType}`;

      items.push({
        id: `${slug}_aspect_${aspectId}`,
        kind: 'aspect',
        aspectId: aspectId,
        aspectType: aspectType,
        orb: pair.aspect.orb,
        exactAngle: pair.aspect.exactAngle,
        from: {
          layerId: fromRef.layerId,
          objectType: fromRef.objectType,
          objectId: fromRef.objectId,
          lon: fromItem.lon,
          ringId: fromRing.id,
          itemId: fromItem.id,
        },
        to: {
          layerId: toRef.layerId,
          objectType: toRef.objectType,
          objectId: toRef.objectId,
          lon: toItem.lon,
          ringId: toRing.id,
          itemId: toItem.id,
        },
      });
    }

    return items;
  }

  /**
   * Convert data source to typed model.
   */
  private static convertDataSource(dataSource: RingDefinition['dataSource']): RingDataSource | null {
    if (dataSource.kind === 'static_zodiac') {
      return { kind: 'static_zodiac' };
    } else if (dataSource.kind === 'static_nakshatras') {
      return { kind: 'static_nakshatras' };
    } else if (dataSource.kind === 'layer_houses') {
      return {
        kind: 'layer_houses',
        layerId: dataSource.layerId,
      };
    } else if (dataSource.kind === 'layer_planets') {
      return {
        kind: 'layer_planets',
        layerId: dataSource.layerId,
      };
    } else if (dataSource.kind === 'layer_varga_planets') {
      return {
        kind: 'layer_varga_planets',
        layerId: dataSource.layerId,
        vargaId: dataSource.vargaId,
      };
    } else if (dataSource.kind === 'aspect_set') {
      const filterDict = dataSource.filter || {};
      const filterObj: AspectSetFilter | null = Object.keys(filterDict).length > 0 ? (filterDict as AspectSetFilter) : null;
      return {
        kind: 'aspect_set',
        aspectSetId: dataSource.aspectSetId,
        filter: filterObj,
      };
    }

    return null;
  }
}

