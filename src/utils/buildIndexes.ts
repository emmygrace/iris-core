import { RenderResponse, RingDTO, RingItemDTO, AspectPairDTO, AspectSetDTO, AspectObjectRef, IndexesDTO } from '../types/render_types';

/**
 * Builds lookup indexes from render response for fast interaction.
 * This is a pure function that transforms the render response into efficient lookup structures.
 */
export function buildIndexes(renderData: RenderResponse): IndexesDTO {
  const ringById: Record<string, RingDTO> = {};
  const itemByRingAndId: Record<string, Record<string, RingItemDTO>> = {};
  const aspectSetById: Record<string, AspectSetDTO> = {};
  const aspectById: Record<string, AspectPairDTO> = {};
  const itemsByLogicalId: Record<string, { ringId: string; itemId: string }[]> = {};
  const aspectsByObjectLogicalId: Record<string, string[]> = {};

  // Build ringById index
  for (const ring of renderData.wheel.rings) {
    ringById[ring.id] = ring;
  }

  // Build itemByRingAndId index
  for (const ring of renderData.wheel.rings) {
    if (!ring.items) continue;
    const map: Record<string, RingItemDTO> = {};
    for (const item of ring.items) {
      map[item.id] = item;
    }
    itemByRingAndId[ring.id] = map;
  }

  // Build aspectSetById and aspectById indexes
  for (const [setId, set] of Object.entries(renderData.aspects.sets)) {
    aspectSetById[setId] = set;
    for (const pair of set.pairs) {
      aspectById[pair.id] = pair;
    }
  }

  // Build itemsByLogicalId index
  for (const ring of renderData.wheel.rings) {
    if (!ring.items) continue;
    for (const item of ring.items) {
      const logicalId = deriveLogicalIdFromRingItem(ring, item);
      if (!logicalId) continue;

      if (!itemsByLogicalId[logicalId]) {
        itemsByLogicalId[logicalId] = [];
      }
      itemsByLogicalId[logicalId].push({ ringId: ring.id, itemId: item.id });
    }
  }

  // Build aspectsByObjectLogicalId index
  for (const set of Object.values(renderData.aspects.sets)) {
    for (const pair of set.pairs) {
      const keyFrom = logicalIdFromAspectRef(pair.from);
      const keyTo = logicalIdFromAspectRef(pair.to);

      for (const key of [keyFrom, keyTo]) {
        if (!aspectsByObjectLogicalId[key]) {
          aspectsByObjectLogicalId[key] = [];
        }
        aspectsByObjectLogicalId[key].push(pair.id);
      }
    }
  }

  return {
    ringById,
    itemByRingAndId,
    aspectSetById,
    aspectById,
    itemsByLogicalId,
    aspectsByObjectLogicalId,
  };
}

/**
 * Derives a logical ID from a ring item.
 * Logical IDs enable cross-referencing across rings and layers.
 * Format: "${layerId}:${objectType}:${objectId}"
 */
function deriveLogicalIdFromRingItem(
  ring: RingDTO,
  item: RingItemDTO
): string | null {
  switch (item.kind) {
    case 'planet':
      // For planet items: "${layerId}:planet:${planetId}"
      return `${item.layerId}:planet:${item.planetId}`;

    case 'houseCusp':
      // For house cusps: "${layerId}:houseCusp:${houseIndex}"
      // We need to find the layerId from the ring's dataSource
      if (ring.dataSource && ring.dataSource.kind === 'layer_houses') {
        return `${ring.dataSource.layerId}:houseCusp:${item.houseIndex}`;
      }
      // If we can't determine layerId, try to infer from items in the same ring
      // For now, return null if we can't determine
      return null;

    case 'sign':
      // Signs are static, might not need logical IDs
      return null;

    case 'aspect':
      // Aspects are handled separately via aspectById
      return null;

    default:
      return null;
  }
}

/**
 * Builds a logical ID from an aspect object reference.
 * Format: "${layerId}:${objectType}:${objectId}"
 */
function logicalIdFromAspectRef(ref: AspectObjectRef): string {
  return `${ref.layerId}:${ref.objectType}:${ref.objectId}`;
}

