/**
 * Client-side dignities calculation service
 * Calculates rulership, detriment, exaltation, fall, and exact exaltation for planets
 * Based on AstroChart's zodiac.ts implementation
 */

import type { DignityResult, DignityType } from '../types/render_types';

// Sign indices (0-11)
const SIGNS_ARIES = 0;
const SIGNS_TAURUS = 1;
const SIGNS_GEMINI = 2;
const SIGNS_CANCER = 3;
const SIGNS_LEO = 4;
const SIGNS_VIRGO = 5;
const SIGNS_LIBRA = 6;
const SIGNS_SCORPIO = 7;
const SIGNS_SAGITTARIUS = 8;
const SIGNS_CAPRICORN = 9;
const SIGNS_AQUARIUS = 10;
const SIGNS_PISCES = 11;

// Sign names
const SIGN_NAMES = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

export interface ExactExaltation {
  planetId: string;
  position: number; // Longitude in degrees
  orbit: number; // Orb in degrees (default 2)
}

/**
 * Get sign index (0-11) from longitude
 */
function getSignIndex(longitude: number): number {
  const normalized = longitude % 360;
  if (normalized === 360) {
    return 0;
  }
  return Math.floor(normalized / 30);
}

/**
 * Get sign name from index
 */
function getSignName(signIndex: number): string {
  return SIGN_NAMES[signIndex] || 'aries';
}

/**
 * Check if planet position is within exact exaltation orb
 */
function hasExactExaltation(
  planetPosition: number,
  exactPosition: number,
  orbit: number
): boolean {
  const normalizedPlanet = planetPosition % 360;
  const normalizedExact = exactPosition % 360;

  const minOrbit = normalizedExact - orbit / 2 < 0
    ? 360 + (normalizedExact - orbit / 2)
    : normalizedExact - orbit / 2;

  const maxOrbit = normalizedExact + orbit / 2 >= 360
    ? (normalizedExact + orbit / 2) - 360
    : normalizedExact + orbit / 2;

  if (minOrbit > maxOrbit) {
    // Crossing over zero
    return normalizedPlanet >= minOrbit || normalizedPlanet <= maxOrbit;
  } else {
    return normalizedPlanet >= minOrbit && normalizedPlanet <= maxOrbit;
  }
}

export class DignitiesService {
  /**
   * Get dignities for a planet based on its longitude
   *
   * @param planetId - Planet identifier (e.g., 'sun', 'moon', 'mercury')
   * @param longitude - Planet longitude in degrees (0-360)
   * @param exactExaltations - Optional array of exact exaltation positions
   * @returns Array of dignity results
   */
  getDignities(
    planetId: string,
    longitude: number,
    exactExaltations?: ExactExaltation[]
  ): DignityResult[] {
    if (!planetId || longitude == null) {
      return [];
    }

    const result: DignityResult[] = [];
    const signIndex = getSignIndex(longitude);
    const signName = getSignName(signIndex);
    const normalizedPosition = longitude % 360;

    // Normalize planet ID to lowercase for comparison
    const planetIdLower = planetId.toLowerCase();

    switch (planetIdLower) {
      case 'sun':
        if (signIndex === SIGNS_LEO) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_AQUARIUS) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_ARIES) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_VIRGO) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'moon':
        if (signIndex === SIGNS_CANCER) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_CAPRICORN) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_TAURUS) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_SCORPIO) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'mercury':
        if (signIndex === SIGNS_GEMINI || signIndex === SIGNS_VIRGO) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_SAGITTARIUS || signIndex === SIGNS_PISCES) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_VIRGO) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_PISCES) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'venus':
        if (signIndex === SIGNS_TAURUS || signIndex === SIGNS_LIBRA) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_ARIES || signIndex === SIGNS_SCORPIO) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_PISCES) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_VIRGO) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'mars':
        if (signIndex === SIGNS_ARIES || signIndex === SIGNS_SCORPIO) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_TAURUS || signIndex === SIGNS_LIBRA) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_CAPRICORN) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_CANCER) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'jupiter':
        if (signIndex === SIGNS_SAGITTARIUS || signIndex === SIGNS_PISCES) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_GEMINI || signIndex === SIGNS_VIRGO) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_CANCER) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_CAPRICORN) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'saturn':
        if (signIndex === SIGNS_CAPRICORN || signIndex === SIGNS_AQUARIUS) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_CANCER || signIndex === SIGNS_LEO) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_LIBRA) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_ARIES) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'uranus':
        if (signIndex === SIGNS_AQUARIUS) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_LEO) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_SCORPIO) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_TAURUS) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'neptune':
        if (signIndex === SIGNS_PISCES) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_VIRGO) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_LEO || signIndex === SIGNS_SAGITTARIUS) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_AQUARIUS || signIndex === SIGNS_GEMINI) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      case 'pluto':
        if (signIndex === SIGNS_SCORPIO) {
          result.push({ type: 'rulership', sign: signName });
        } else if (signIndex === SIGNS_TAURUS) {
          result.push({ type: 'detriment', sign: signName });
        }
        if (signIndex === SIGNS_ARIES) {
          result.push({ type: 'exaltation', sign: signName });
        } else if (signIndex === SIGNS_LIBRA) {
          result.push({ type: 'fall', sign: signName });
        }
        break;

      default:
        break;
    }

    // Check for exact exaltation if provided
    if (exactExaltations && Array.isArray(exactExaltations)) {
      for (const exactExalt of exactExaltations) {
        if (exactExalt.planetId.toLowerCase() === planetIdLower) {
          const orbit = exactExalt.orbit || 2.0; // Default orb is 2 degrees
          if (hasExactExaltation(normalizedPosition, exactExalt.position, orbit)) {
            result.push({
              type: 'exactExaltation',
              sign: signName,
              degree: exactExalt.position,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Get default exact exaltation positions (based on Aleister Crowley)
   */
  getDefaultExactExaltations(): ExactExaltation[] {
    return [
      { planetId: 'sun', position: 19, orbit: 2 }, // 19° Aries
      { planetId: 'moon', position: 33, orbit: 2 }, // 3° Taurus
      { planetId: 'mercury', position: 155, orbit: 2 }, // 15° Virgo
      { planetId: 'venus', position: 357, orbit: 2 }, // 27° Pisces
      { planetId: 'mars', position: 298, orbit: 2 }, // 28° Capricorn
      { planetId: 'jupiter', position: 105, orbit: 2 }, // 15° Cancer
      { planetId: 'saturn', position: 201, orbit: 2 }, // 21° Libra
    ];
  }
}

// Export singleton instance
export const dignitiesService = new DignitiesService();

