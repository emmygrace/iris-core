/**
 * Collision detection utilities for preventing planet symbol overlap
 * Based on AstroChart's collision detection implementation
 */

/**
 * Interface for a point with position data used in collision detection
 */
export interface LocatedPoint {
  id: string;
  x: number;
  y: number;
  r: number;
  angle: number;
  originalAngle: number; // Original astronomical angle (lon)
  pointer?: number; // Optional pointer angle (for display)
}

/**
 * Configuration for collision detection
 */
export interface CollisionConfig {
  enabled: boolean;
  radius: number; // Collision radius in pixels at scale 1
  scale: number; // Scale multiplier for responsive sizing
  debug?: boolean; // Enable debug logging
  shiftInDegrees?: number; // Rotation offset (default: 0, meaning 0° = right)
}

/**
 * Universe/circle context for collision detection
 */
export interface Universe {
  cx: number; // Center X
  cy: number; // Center Y
  r: number; // Radius
}

/**
 * Calculate position of a point on a circle
 * @param cx - center x
 * @param cy - center y
 * @param radius - circle radius
 * @param angle - angle in degrees
 * @param shiftInDegrees - rotation offset (default: 0)
 * @returns Object with x and y coordinates
 */
export function getPointPosition(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  shiftInDegrees: number = 0
): { x: number; y: number } {
  // Convert angle to radians, accounting for shift
  // For standard polar coordinates: 0° = right (3 o'clock), increasing counter-clockwise
  const angleInRadians = ((angle - shiftInDegrees) * Math.PI) / 180;
  const xPos = cx + radius * Math.cos(angleInRadians);
  const yPos = cy + radius * Math.sin(angleInRadians);
  return { x: xPos, y: yPos };
}

/**
 * Check circle collision between two objects
 * @param circle1 - First circle with x, y, r
 * @param circle2 - Second circle with x, y, r
 * @returns true if circles overlap
 */
export function isCollision(
  circle1: { x: number; y: number; r: number },
  circle2: { x: number; y: number; r: number }
): boolean {
  // Calculate the vector between the circles' center points
  const vx = circle1.x - circle2.x;
  const vy = circle1.y - circle2.y;

  const magnitude = Math.sqrt(vx * vx + vy * vy);

  // Check if distance is less than or equal to sum of radii
  const totalRadii = circle1.r + circle2.r;

  return magnitude <= totalRadii;
}

/**
 * Check collision between an angle and existing points
 * Handles 0°/360° wrapping
 * @param angle - Angle to check in degrees
 * @param points - Array of points with angle property
 * @param config - Collision configuration
 * @returns true if angle conflicts with any point
 */
export function isAngularCollision(
  angle: number,
  points: Array<{ angle: number }>,
  config: CollisionConfig
): boolean {
  const deg360 = 360;
  const collisionRadius = (config.radius * config.scale) / 2;

  for (let i = 0, ln = points.length; i < ln; i++) {
    const pointAngle = points[i].angle;
    const angleDiff = Math.abs(pointAngle - angle);
    const wrappedDiff = deg360 - angleDiff;

    if (angleDiff <= collisionRadius || wrappedDiff <= collisionRadius) {
      return true;
    }
  }

  return false;
}

/**
 * Sets the positions of two points that are in collision
 * Adjusts their angles to separate them
 * @param p1 - First point (will be modified)
 * @param p2 - Second point (will be modified)
 */
export function placePointsInCollision(p1: LocatedPoint, p2: LocatedPoint): void {
  const step = 1; // Degrees to adjust per step
  let adjustedP1Pointer = p1.pointer !== undefined ? p1.pointer : p1.angle;
  let adjustedP2Pointer = p2.pointer !== undefined ? p2.pointer : p2.angle;

  // Handle zero crossing (when points are near 0°/360° boundary)
  if (Math.abs(adjustedP1Pointer - adjustedP2Pointer) > 180) {
    adjustedP1Pointer = (adjustedP1Pointer + 180) % 360;
    adjustedP2Pointer = (adjustedP2Pointer + 180) % 360;
  }

  // Adjust angles to separate points
  if (adjustedP1Pointer <= adjustedP2Pointer) {
    p1.angle = p1.angle - step;
    p2.angle = p2.angle + step;
  } else {
    p1.angle = p1.angle + step;
    p2.angle = p2.angle - step;
  }

  // Normalize angles to 0-360 range
  p1.angle = (p1.angle + 360) % 360;
  p2.angle = (p2.angle + 360) % 360;
}

/**
 * Compare two points by angle for sorting
 * @param pointA - First point
 * @param pointB - Second point
 * @returns Comparison result for sorting
 */
export function comparePoints(
  pointA: { angle: number },
  pointB: { angle: number }
): number {
  return pointA.angle - pointB.angle;
}

/**
 * Places a new point in the located list, resolving collisions recursively
 * @param locatedPoints - Array of already placed points
 * @param point - New point to place
 * @param universe - Circle context (center and radius)
 * @param config - Collision configuration
 * @returns Updated array of located points
 */
export function assemble(
  locatedPoints: LocatedPoint[],
  point: LocatedPoint,
  universe: Universe,
  config: CollisionConfig
): LocatedPoint[] {
  // First item - no collision possible
  if (locatedPoints.length === 0) {
    locatedPoints.push(point);
    return locatedPoints;
  }

  // Validate that circumference can accommodate all points
  const effectiveRadius = config.radius * config.scale;
  const circumference = 2 * Math.PI * universe.r;
  const requiredCircumference = 2 * effectiveRadius * (locatedPoints.length + 2);

  if (circumference - requiredCircumference <= 0) {
    if (config.debug) {
      console.log(
        `Universe circumference: ${circumference}, Required: ${requiredCircumference}`
      );
    }
    throw new Error(
      'Unresolved planet collision. Try increasing radius or reducing symbol scale.'
    );
  }

  // Sort points by angle for efficient checking
  locatedPoints.sort(comparePoints);

  // Check for collisions
  let hasCollision = false;
  let locatedButInCollisionPoint: LocatedPoint | null = null;
  let collisionIndex: number | null = null;

  for (let i = 0, ln = locatedPoints.length; i < ln; i++) {
    if (isCollision(locatedPoints[i], point)) {
      hasCollision = true;
      locatedButInCollisionPoint = locatedPoints[i];
      collisionIndex = i;

      if (config.debug) {
        console.log(
          `Resolve collision: ${locatedButInCollisionPoint.id} X ${point.id}`
        );
      }

      break;
    }
  }

  // Resolve collision if found
  if (hasCollision && locatedButInCollisionPoint !== null && collisionIndex !== null) {
    // Adjust angles of colliding points
    placePointsInCollision(locatedButInCollisionPoint, point);

    // Update positions based on new angles
    const newPointPosition1 = getPointPosition(
      universe.cx,
      universe.cy,
      universe.r,
      locatedButInCollisionPoint.angle,
      config.shiftInDegrees || 0
    );
    locatedButInCollisionPoint.x = newPointPosition1.x;
    locatedButInCollisionPoint.y = newPointPosition1.y;

    const newPointPosition2 = getPointPosition(
      universe.cx,
      universe.cy,
      universe.r,
      point.angle,
      config.shiftInDegrees || 0
    );
    point.x = newPointPosition2.x;
    point.y = newPointPosition2.y;

    // Remove the colliding point from the list
    locatedPoints.splice(collisionIndex, 1);

    // Recursively re-insert both points
    locatedPoints = assemble(locatedPoints, locatedButInCollisionPoint, universe, config);
    locatedPoints = assemble(locatedPoints, point, universe, config);
  } else {
    // No collision - add point directly
    locatedPoints.push(point);
  }

  // Sort by angle before returning
  locatedPoints.sort(comparePoints);
  return locatedPoints;
}

/**
 * Apply collision detection to an array of planet items
 * @param items - Array of planet items with lon (longitude) property
 * @param radius - Circle radius for positioning
 * @param config - Collision configuration
 * @returns Array of items with displayAngle added if collision was resolved
 */
export function resolveCollisions<T extends { id: string; lon: number }>(
  items: T[],
  radius: number,
  config: CollisionConfig
): Array<T & { displayAngle?: number }> {
  if (!config.enabled || items.length === 0) {
    return items;
  }

  const centerX = 0;
  const centerY = 0;
  const effectiveRadius = config.radius * config.scale;

  // Convert items to LocatedPoint format
  const locatedPoints: LocatedPoint[] = [];
  const itemMap = new Map<string, T>();

  for (const item of items) {
    const angle = item.lon;
    const position = getPointPosition(
      centerX,
      centerY,
      radius,
      angle,
      config.shiftInDegrees || 0
    );

    const locatedPoint: LocatedPoint = {
      id: item.id,
      x: position.x,
      y: position.y,
      r: effectiveRadius,
      angle: angle,
      originalAngle: angle,
      pointer: angle,
    };

    itemMap.set(item.id, item);
    locatedPoints.push(locatedPoint);
  }

  // Process all points through collision detection
  const universe: Universe = {
    cx: centerX,
    cy: centerY,
    r: radius,
  };

  let resolvedPoints: LocatedPoint[] = [];
  for (const point of locatedPoints) {
    resolvedPoints = assemble(resolvedPoints, { ...point }, universe, config);
  }

  // Convert back to items with displayAngle if adjusted
  return resolvedPoints.map((point) => {
    const originalItem = itemMap.get(point.id)!;
    const result: T & { displayAngle?: number } = { ...originalItem };

    // Only add displayAngle if it differs from original lon
    if (Math.abs(point.angle - point.originalAngle) > 0.01) {
      result.displayAngle = point.angle;
    }

    return result;
  });
}

