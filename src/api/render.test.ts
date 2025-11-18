/**
 * Unit tests for render API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { createRenderApi, RenderApi } from './render';
import type { EphemerisResponse } from '../types/ephemeris_types';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  create: vi.Mock;
  AxiosInstance: typeof AxiosInstance;
};

describe('RenderApi', () => {
  let mockAxiosInstance: Partial<AxiosInstance>;
  let renderApi: RenderApi;

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as AxiosInstance);
    renderApi = createRenderApi(mockAxiosInstance as AxiosInstance);
  });

  it('should call render endpoint with correct request', async () => {
    const mockResponse: EphemerisResponse = {
      layers: {
        natal: {
          id: 'natal',
          kind: 'natal',
          dateTime: '2024-01-01T12:00:00Z',
          location: {
            name: 'New York',
            lat: 40.7128,
            lon: -74.0060,
          },
          positions: {
            planets: {
              sun: {
                lon: 280.5,
                lat: 1.2,
                speedLon: 0.95,
                retrograde: false,
              },
              moon: {
                lon: 40.25,
                lat: -2.3,
                speedLon: 12.3,
                retrograde: false,
              },
            },
            houses: {
              system: 'placidus',
              cusps: {
                '1': 15.0,
                '2': 45.0,
                '3': 75.0,
                '4': 105.0,
                '5': 135.0,
                '6': 165.0,
                '7': 195.0,
                '8': 225.0,
                '9': 255.0,
                '10': 285.0,
                '11': 315.0,
                '12': 345.0,
              },
              angles: {
                asc: 15.0,
                mc: 285.0,
                ic: 105.0,
                dc: 195.0,
              },
            },
          },
        },
      },
      settings: {
        zodiacType: 'tropical',
        ayanamsa: null,
        houseSystem: 'placidus',
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['sun', 'moon'],
      },
    };

    (mockAxiosInstance.post as any).mockResolvedValue({
      data: mockResponse,
    });

    const request = {
      subjects: [
        {
          id: 'subject1',
          name: 'Test Subject',
          birthDateTime: '2024-01-01T12:00:00Z',
          birthTimezone: 'UTC',
          location: {
            name: 'New York',
            lat: 40.7128,
            lon: -74.0060,
          },
        },
      ],
      settings: {
        zodiacType: 'tropical' as const,
        ayanamsa: null,
        houseSystem: 'placidus' as const,
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['sun', 'moon'],
      },
      layer_config: {
        natal: {
          kind: 'natal' as const,
          subjectId: 'subject1',
        },
      },
    };

    const result = await renderApi.render(request);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/render', request);
    expect(result).toEqual(mockResponse);
    expect(result.layers.natal.positions.planets.sun).toBeDefined();
    expect(result.layers.natal.positions.houses).toBeDefined();
  });

  it('should handle response with missing houses', async () => {
    const mockResponse: EphemerisResponse = {
      layers: {
        natal: {
          id: 'natal',
          kind: 'natal',
          dateTime: '2024-01-01T12:00:00Z',
          location: null,
          positions: {
            planets: {
              sun: {
                lon: 280.5,
                lat: 1.2,
                speedLon: 0.95,
                retrograde: false,
              },
            },
            houses: null,
          },
        },
      },
      settings: {
        zodiacType: 'tropical',
        ayanamsa: null,
        houseSystem: 'placidus',
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['sun'],
      },
    };

    (mockAxiosInstance.post as any).mockResolvedValue({
      data: mockResponse,
    });

    const request = {
      subjects: [],
      settings: {
        zodiacType: 'tropical' as const,
        ayanamsa: null,
        houseSystem: 'placidus' as const,
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['sun'],
      },
      layer_config: {},
    };

    const result = await renderApi.render(request);

    expect(result.layers.natal.positions.houses).toBeNull();
    expect(result.layers.natal.positions.planets.sun).toBeDefined();
  });

  it('should handle response with retrograde planets', async () => {
    const mockResponse: EphemerisResponse = {
      layers: {
        natal: {
          id: 'natal',
          kind: 'natal',
          dateTime: '2024-01-01T12:00:00Z',
          location: null,
          positions: {
            planets: {
              mercury: {
                lon: 150.5,
                lat: 0.5,
                speedLon: -0.5,
                retrograde: true,
              },
            },
            houses: null,
          },
        },
      },
      settings: {
        zodiacType: 'tropical',
        ayanamsa: null,
        houseSystem: 'placidus',
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['mercury'],
      },
    };

    (mockAxiosInstance.post as any).mockResolvedValue({
      data: mockResponse,
    });

    const request = {
      subjects: [],
      settings: {
        zodiacType: 'tropical' as const,
        ayanamsa: null,
        houseSystem: 'placidus' as const,
        orbSettings: {
          conjunction: 8.0,
          opposition: 8.0,
          trine: 7.0,
          square: 6.0,
          sextile: 4.0,
        },
        includeObjects: ['mercury'],
      },
      layer_config: {},
    };

    const result = await renderApi.render(request);

    expect(result.layers.natal.positions.planets.mercury.retrograde).toBe(true);
    expect(result.layers.natal.positions.planets.mercury.speedLon).toBeLessThan(0);
  });
});

