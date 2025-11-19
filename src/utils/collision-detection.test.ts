/**
 * Unit tests for collision detection utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getPointPosition,
  isCollision,
  isAngularCollision,
  placePointsInCollision,
  comparePoints,
  assemble,
  resolveCollisions,
  type LocatedPoint,
  type CollisionConfig,
  type Universe,
} from './collision-detection';

describe('getPointPosition', () => {
  it('should return position for angle 0° (right)', () => {
    const position = getPointPosition(0, 0, 10, 0, 0);
    expect(position.x).toBeCloseTo(10);
    expect(position.y).toBeCloseTo(0);
  });

  it('should return position for angle 90° (top)', () => {
    const position = getPointPosition(0, 0, 10, 90, 0);
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(10);
  });

  it('should return position for angle 180° (left)', () => {
    const position = getPointPosition(0, 0, 10, 180, 0);
    expect(position.x).toBeCloseTo(-10);
    expect(position.y).toBeCloseTo(0);
  });

  it('should return position for angle 270° (bottom)', () => {
    const position = getPointPosition(0, 0, 10, 270, 0);
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(-10);
  });

  it('should handle angle wrapping (360° = 0°)', () => {
    const pos1 = getPointPosition(0, 0, 10, 0, 0);
    const pos2 = getPointPosition(0, 0, 10, 360, 0);
    expect(pos1.x).toBeCloseTo(pos2.x);
    expect(pos1.y).toBeCloseTo(pos2.y);
  });

  it('should handle offset center', () => {
    const position = getPointPosition(100, 200, 10, 0, 0);
    expect(position.x).toBeCloseTo(110);
    expect(position.y).toBeCloseTo(200);
  });
});

describe('isCollision', () => {
  it('should detect collision when circles overlap', () => {
    const circle1 = { x: 10, y: 10, r: 5 };
    const circle2 = { x: 10, y: 10, r: 5 };
    expect(isCollision(circle1, circle2)).toBe(true);
  });

  it('should detect collision when circles touch', () => {
    const circle1 = { x: 10, y: 10, r: 5 };
    const circle2 = { x: 20, y: 10, r: 5 };
    expect(isCollision(circle1, circle2)).toBe(true);
  });

  it('should not detect collision when circles are separate', () => {
    const circle1 = { x: 10, y: 10, r: 5 };
    const circle2 = { x: 21, y: 10, r: 5 };
    expect(isCollision(circle1, circle2)).toBe(false);
  });

  it('should detect collision with different radii', () => {
    const circle1 = { x: 10, y: 10, r: 5 };
    const circle2 = { x: 20, y: 10, r: 10 };
    expect(isCollision(circle1, circle2)).toBe(true);
  });

  it('should handle vertical separation', () => {
    const circle1 = { x: 10, y: 10, r: 5 };
    const circle2 = { x: 10, y: 20, r: 5 };
    expect(isCollision(circle1, circle2)).toBe(true);
  });
});

describe('isAngularCollision', () => {
  const config: CollisionConfig = {
    enabled: true,
    radius: 10,
    scale: 1,
  };

  it('should detect angular collision when angles are close', () => {
    const points = [{ angle: 10 }];
    expect(isAngularCollision(12, points, config)).toBe(true);
  });

  it('should not detect collision when angles are far apart', () => {
    const points = [{ angle: 10 }];
    expect(isAngularCollision(50, points, config)).toBe(false);
  });

  it('should handle 0°/360° wrapping', () => {
    const points = [{ angle: 359 }];
    expect(isAngularCollision(1, points, config)).toBe(true);
  });

  it('should handle multiple points', () => {
    const points = [{ angle: 10 }, { angle: 50 }, { angle: 100 }];
    expect(isAngularCollision(12, points, config)).toBe(true);
    expect(isAngularCollision(30, points, config)).toBe(false);
  });
});

describe('comparePoints', () => {
  it('should compare points by angle', () => {
    expect(comparePoints({ angle: 10 }, { angle: 20 })).toBe(-10);
    expect(comparePoints({ angle: 20 }, { angle: 20 })).toBe(0);
    expect(comparePoints({ angle: 30 }, { angle: 20 })).toBe(10);
  });

  it('should handle zero crossing', () => {
    expect(comparePoints({ angle: 0 }, { angle: 1 })).toBe(-1);
    expect(comparePoints({ angle: 359.99 }, { angle: 0 })).toBeCloseTo(359.99);
  });
});

describe('placePointsInCollision', () => {
  it('should separate points when p1 < p2', () => {
    const p1: LocatedPoint = {
      id: 'p1',
      x: 0,
      y: 0,
      r: 5,
      angle: 10,
      originalAngle: 10,
      pointer: 10,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 0,
      y: 0,
      r: 5,
      angle: 10,
      originalAngle: 10,
      pointer: 20,
    };

    placePointsInCollision(p1, p2);

    expect(p1.angle).toBe(9);
    expect(p2.angle).toBe(11);
  });

  it('should separate points when p1 > p2', () => {
    const p1: LocatedPoint = {
      id: 'p1',
      x: 0,
      y: 0,
      r: 5,
      angle: 20,
      originalAngle: 20,
      pointer: 20,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 0,
      y: 0,
      r: 5,
      angle: 10,
      originalAngle: 10,
      pointer: 10,
    };

    placePointsInCollision(p1, p2);

    expect(p1.angle).toBe(21);
    expect(p2.angle).toBe(9);
  });

  it('should handle zero crossing (0°/360°)', () => {
    const p1: LocatedPoint = {
      id: 'p1',
      x: 0,
      y: 0,
      r: 5,
      angle: 1,
      originalAngle: 1,
      pointer: 1,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 0,
      y: 0,
      r: 5,
      angle: 359,
      originalAngle: 359,
      pointer: 359,
    };

    placePointsInCollision(p1, p2);

    // Should normalize angles
    expect(p1.angle).toBeGreaterThanOrEqual(0);
    expect(p1.angle).toBeLessThan(360);
    expect(p2.angle).toBeGreaterThanOrEqual(0);
    expect(p2.angle).toBeLessThan(360);
  });

  it('should normalize angles to 0-360 range', () => {
    const p1: LocatedPoint = {
      id: 'p1',
      x: 0,
      y: 0,
      r: 5,
      angle: -5,
      originalAngle: -5,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 0,
      y: 0,
      r: 5,
      angle: 365,
      originalAngle: 365,
    };

    placePointsInCollision(p1, p2);

    expect(p1.angle).toBeGreaterThanOrEqual(0);
    expect(p1.angle).toBeLessThan(360);
    expect(p2.angle).toBeGreaterThanOrEqual(0);
    expect(p2.angle).toBeLessThan(360);
  });
});

describe('assemble', () => {
  const config: CollisionConfig = {
    enabled: true,
    radius: 10,
    scale: 1,
    debug: false,
  };

  it('should add first point without collision', () => {
    const universe: Universe = { cx: 0, cy: 0, r: 100 };
    const point: LocatedPoint = {
      id: 'p1',
      x: 100,
      y: 0,
      r: 10,
      angle: 0,
      originalAngle: 0,
    };

    const result = assemble([], point, universe, config);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('should place non-colliding points separately', () => {
    const universe: Universe = { cx: 0, cy: 0, r: 100 };
    const config: CollisionConfig = {
      enabled: true,
      radius: 5,
      scale: 1,
    };

    const p1: LocatedPoint = {
      id: 'p1',
      x: 100,
      y: 0,
      r: 5,
      angle: 0,
      originalAngle: 0,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 0,
      y: 100,
      r: 5,
      angle: 90,
      originalAngle: 90,
    };

    let result = assemble([], p1, universe, config);
    result = assemble(result, p2, universe, config);

    expect(result).toHaveLength(2);
    expect(result[0].angle).toBe(0);
    expect(result[1].angle).toBe(90);
  });

  it('should resolve collision between two points', () => {
    const universe: Universe = { cx: 0, cy: 0, r: 100 };
    const config: CollisionConfig = {
      enabled: true,
      radius: 10,
      scale: 1,
    };

    const p1: LocatedPoint = {
      id: 'p1',
      x: 100,
      y: 0,
      r: 10,
      angle: 0,
      originalAngle: 0,
      pointer: 0,
    };
    const p2: LocatedPoint = {
      id: 'p2',
      x: 100,
      y: 0,
      r: 10,
      angle: 2,
      originalAngle: 2,
      pointer: 2,
    };

    let result = assemble([], p1, universe, config);
    result = assemble(result, p2, universe, config);

    expect(result).toHaveLength(2);
    // Angles should be adjusted
    expect(result[0].angle).not.toBe(0);
    expect(result[1].angle).not.toBe(2);
  });

  it('should handle multiple collisions recursively', () => {
    const universe: Universe = { cx: 0, cy: 0, r: 100 };
    const config: CollisionConfig = {
      enabled: true,
      radius: 10,
      scale: 1,
    };

    const points: LocatedPoint[] = [
      {
        id: 'p1',
        x: 100,
        y: 0,
        r: 10,
        angle: 0,
        originalAngle: 0,
      },
      {
        id: 'p2',
        x: 100,
        y: 0,
        r: 10,
        angle: 1,
        originalAngle: 1,
      },
      {
        id: 'p3',
        x: 100,
        y: 0,
        r: 10,
        angle: 2,
        originalAngle: 2,
      },
    ];

    let result: LocatedPoint[] = [];
    for (const point of points) {
      result = assemble(result, { ...point }, universe, config);
    }

    expect(result).toHaveLength(3);
    // All points should have different angles
    const angles = result.map((p) => p.angle);
    const uniqueAngles = new Set(angles);
    expect(uniqueAngles.size).toBe(3);
  });

  it('should throw error when circumference is too small', () => {
    const universe: Universe = { cx: 0, cy: 0, r: 10 }; // Very small radius
    const config: CollisionConfig = {
      enabled: true,
      radius: 10,
      scale: 1,
    };

    const point: LocatedPoint = {
      id: 'p1',
      x: 10,
      y: 0,
      r: 10,
      angle: 0,
      originalAngle: 0,
    };

    expect(() => {
      assemble([], point, universe, config);
    }).toThrow('Unresolved planet collision');
  });
});

describe('resolveCollisions', () => {
  const defaultConfig: CollisionConfig = {
    enabled: true,
    radius: 10,
    scale: 1,
  };

  it('should return items unchanged when collision detection is disabled', () => {
    const config: CollisionConfig = {
      enabled: false,
      radius: 10,
      scale: 1,
    };

    const items = [
      { id: 'p1', lon: 0 },
      { id: 'p2', lon: 1 },
    ];

    const result = resolveCollisions(items, 100, config);
    expect(result).toEqual(items);
    expect(result[0]).not.toHaveProperty('displayAngle');
  });

  it('should return items unchanged when no collisions exist', () => {
    const items = [
      { id: 'p1', lon: 0 },
      { id: 'p2', lon: 90 },
      { id: 'p3', lon: 180 },
    ];

    const result = resolveCollisions(items, 100, defaultConfig);
    expect(result).toHaveLength(3);
    expect(result[0]).not.toHaveProperty('displayAngle');
    expect(result[1]).not.toHaveProperty('displayAngle');
    expect(result[2]).not.toHaveProperty('displayAngle');
  });

  it('should add displayAngle when collisions are resolved', () => {
    const items = [
      { id: 'p1', lon: 0 },
      { id: 'p2', lon: 2 }, // Very close to p1
    ];

    const result = resolveCollisions(items, 100, defaultConfig);
    expect(result).toHaveLength(2);

    // At least one should have displayAngle if collision was resolved
    const hasDisplayAngle = result.some((item) => 'displayAngle' in item);
    expect(hasDisplayAngle).toBe(true);
  });

  it('should preserve original lon values', () => {
    const items = [
      { id: 'p1', lon: 0 },
      { id: 'p2', lon: 1 },
    ];

    const result = resolveCollisions(items, 100, defaultConfig);
    expect(result[0].lon).toBe(0);
    expect(result[1].lon).toBe(1);
  });

  it('should handle empty array', () => {
    const result = resolveCollisions([], 100, defaultConfig);
    expect(result).toEqual([]);
  });
});

