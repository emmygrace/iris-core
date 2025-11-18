# @gaia-tools/iris-core

Lightweight, framework-agnostic client bundle for Gaia astrological charting.

## Overview

`@gaia-tools/iris-core` provides a unified interface for working with the Gaia astrological charting system. It combines:

- **API Client** - Communicate with the Python `coeus-api` backend
- **Chart Rendering** - Render charts using the `ChartWheel` class
- **Client-side Processing** - Aspect calculation, wheel assembly, and data conversion utilities

This package is designed to be framework-agnostic and can be used with vanilla JavaScript, React, Vue, Svelte, or any other framework.

## Installation

```bash
npm install @gaia-tools/iris-core @gaia-tools/aphrodite-d3 @gaia-tools/aphrodite-shared axios d3
```

## Quick Start

```typescript
import {
  createApiClient,
  ChartWheel,
  convertEphemerisToRender,
  buildIndexes,
} from '@gaia-tools/iris-core';

// Create API client
const api = createApiClient('http://localhost:8000/api');

// Fetch ephemeris data from backend
const ephemerisResponse = await api.render.render({
  subjects: [
    {
      id: 'subject_1',
      label: 'Person',
      birthDateTime: '1990-01-01T12:00:00',
      birthTimezone: 'America/New_York',
      location: {
        name: 'New York',
        lat: 40.7128,
        lon: -74.0060,
      },
    },
  ],
  settings: {
    zodiacType: 'tropical',
    houseSystem: 'placidus',
    includeObjects: ['sun', 'moon', 'mercury', 'venus', 'mars'],
  },
  layer_config: {
    natal: {
      kind: 'natal',
      subjectId: 'subject_1',
    },
  },
});

// Convert ephemeris response to render data (calculates aspects, assembles wheel)
const renderData = convertEphemerisToRender(ephemerisResponse);

// Build indexes for fast lookups
const indexes = buildIndexes(renderData);

// Render chart
const container = document.getElementById('chart');
if (container) {
  const chart = new ChartWheel(container, {
    renderData,
    indexes,
    width: 800,
    height: 800,
    theme: 'traditional',
  });
}
```

## API Reference

### `createApiClient(baseURL, config?)`

Creates an API client instance for communicating with the backend.

```typescript
const api = createApiClient('http://localhost:8000/api');
```

### `ChartWheel`

Framework-agnostic chart renderer class.

```typescript
const chart = new ChartWheel(container, {
  renderData: RenderResponse,
  indexes: IndexesDTO,
  width?: number,
  height?: number,
  theme?: 'traditional' | 'modern',
  visualConfig?: VisualConfig,
  glyphConfig?: GlyphConfig,
  onItemClick?: (item: RingItemDTO, ring: RingDTO) => void,
  onAspectClick?: (aspect: AspectPairDTO) => void,
});
```

### `convertEphemerisToRender(ephemerisResponse, wheelConfig?)`

Converts an `EphemerisResponse` (positions only) to a `RenderResponse` (with aspects and wheel).

```typescript
const renderData = convertEphemerisToRender(ephemerisResponse);
```

### `buildIndexes(renderData)`

Builds lookup indexes from render data for fast interaction.

```typescript
const indexes = buildIndexes(renderData);
```

### `buildRenderRequestFromResponse(renderData)`

Builds a `RenderRequest` from existing `RenderResponse` data for re-rendering.

```typescript
const request = buildRenderRequestFromResponse(renderData);
```

## Vedic / Jyotish Mode

- Include a `vedicConfig` block inside `ChartSettings` to request nakshatra overlays, divisional charts, dashas, and optional yoga detection. The shape mirrors the backend schema (`includeNakshatras`, `vargas`, `includeDashas`, `dashaSystems`, etc.).
- `EphemerisResponse.vedic` (and consequently `RenderResponse.vedic`) now carry:
  - `layers[layerId].nakshatras` — per-object nakshatra + pada metadata.
  - `layers[layerId].vargas` — derived D-charts such as Navamsa (`d9`) or Dasamsa (`d10`).
  - `dashas` — Vimshottari periods down to maha/antara/pratyantara depth.
- The render API client exposes Vedic helpers:

```typescript
const api = createApiClient('http://localhost:8000/api');
await api.render.renderVedic(request); // POST /api/vedic/render
await api.render.dashas(request);      // POST /api/vedic/dashas
```

- `convertEphemerisToRender` automatically attaches the backend `vedic` payload so downstream consumers (React/Vue, etc.) can surface nakshatra placements or dashas alongside the chart.
- `@gaia-tools/aphrodite-shared` ships a new `Vedic Natal Wheel` definition (nakshatra ring + whole-sign houses + natal planets + Navamsa overlay). Retrieve it via `getWheelDefinition('Vedic Natal Wheel')` when assembling render data.

## Astrocartography & Relocation

- `createApiClient` now exposes `api.astrocartography` with two helpers:

```typescript
const lines = await api.astrocartography.lines({
  dateTime: '2024-01-01T12:00:00Z',
  settings,
  planetIds: ['sun', 'moon'],
  angles: ['asc', 'mc'],
});

const relocated = await api.astrocartography.relocate({
  dateTime: '2024-01-01T12:00:00Z',
  settings,
  newLocation: { lat: 51.5, lon: -0.1 },
  positions: layer.positions,
});
```

- Pair the FeatureCollection result with `@gaia-tools/atlas-map` to draw planetary lines on top of Leaflet/Mapbox tiles.
- The relocation response returns a fresh `LayerPositions` object with updated cusps/angles so you can immediately re-render a relocated wheel.

## Framework Integration

### Vanilla JavaScript

```typescript
import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/iris-core';

// Use directly
const api = createApiClient('http://localhost:8000/api');
// ... rest of code
```

### React

```typescript
import { useEffect, useRef } from 'react';
import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/iris-core';

function ChartComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartWheel | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Fetch and render chart
    const api = createApiClient('http://localhost:8000/api');
    api.render.render(request).then((ephemerisResponse) => {
      const renderData = convertEphemerisToRender(ephemerisResponse);
      const indexes = buildIndexes(renderData);

      chartRef.current = new ChartWheel(containerRef.current!, {
        renderData,
        indexes,
      });
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue

```vue
<template>
  <div ref="chartContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/iris-core';

const chartContainer = ref<HTMLDivElement | null>(null);
let chart: ChartWheel | null = null;

onMounted(async () => {
  if (!chartContainer.value) return;

  const api = createApiClient('http://localhost:8000/api');
  const ephemerisResponse = await api.render.render(request);
  const renderData = convertEphemerisToRender(ephemerisResponse);
  const indexes = buildIndexes(renderData);

  chart = new ChartWheel(chartContainer.value, {
    renderData,
    indexes,
  });
});

onUnmounted(() => {
  chart?.destroy();
});
</script>
```

## Styling

The `ChartWheel` component includes default styles. To customize, import the CSS:

```typescript
import '@gaia-tools/aphrodite-d3/src/ChartWheel.css';
```

Or provide custom `visualConfig` and `glyphConfig` options.

## Dependencies

This package has peer dependencies on:

- `@gaia-tools/aphrodite-d3` - Chart rendering (D3-based)
- `@gaia-tools/aphrodite-shared` - Shared configurations
- `axios` - HTTP client for API requests
- `d3` - D3.js for rendering

Make sure to install these in your project.

## Type Exports

This package exports all types for use by other packages. You can import types from `@gaia-tools/iris-core`:

```typescript
import type {
  RenderResponse,
  EphemerisResponse,
  RenderRequest,
  IndexesDTO,
  // ... and more
} from '@gaia-tools/iris-core';
```

## License

MIT

