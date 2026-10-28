import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MapView } from './MapView';
import type { BBox } from '../lib/geo';

// Mock leaflet to avoid needing a real DOM / browser environment
vi.mock('leaflet', () => {
  const mockMap = {
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  const mockTileLayer = {
    addTo: vi.fn().mockReturnThis(),
  };

  const mockRectangle = {
    addTo: vi.fn().mockReturnThis(),
  };

  const defaultExport = {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    rectangle: vi.fn(() => mockRectangle),
    latLngBounds: vi.fn(() => ({})),
  };

  return { default: defaultExport };
});

// Also mock the CSS import to avoid warnings
vi.mock('leaflet/dist/leaflet.css', () => ({}));

describe('MapView', () => {
  const bbox: BBox = [106.7, -6.3, 106.9, -6.1];

  const noop = () => {};

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders without error', () => {
    const { container } = render(
      <MapView
        bbox={bbox}
        ignitionPoints={[]}
        onAddIgnitionPoint={noop}
        onRemoveIgnitionPoint={noop}
      />
    );
    const mapDiv = container.querySelector('div');
    expect(mapDiv).toBeInTheDocument();
    expect(mapDiv).toHaveStyle({ width: '100%', minHeight: '400px' });
  });

  it('creates leaflet map and tile layer on mount', async () => {
    const L = await import('leaflet');
    render(
      <MapView
        bbox={bbox}
        ignitionPoints={[]}
        onAddIgnitionPoint={noop}
        onRemoveIgnitionPoint={noop}
      />
    );
    expect(L.default.map).toHaveBeenCalledTimes(1);
    expect(L.default.tileLayer).toHaveBeenCalledWith(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({
        attribution: expect.stringContaining('OpenStreetMap'),
        maxZoom: 19,
      })
    );
  });

  it('creates bbox rectangle and calls fitBounds', async () => {
    const L = await import('leaflet');
    render(
      <MapView
        bbox={bbox}
        ignitionPoints={[]}
        onAddIgnitionPoint={noop}
        onRemoveIgnitionPoint={noop}
      />
    );
    expect(L.default.rectangle).toHaveBeenCalledTimes(1);
    const rectCall = vi.mocked(L.default.rectangle).mock.calls[0];
    expect(rectCall[1]).toMatchObject({
      color: '#3388ff',
      weight: 2,
      fill: false,
      interactive: false,
    });
    const mapInstance = vi.mocked(L.default.map).mock.results[0].value;
    expect(mapInstance.fitBounds).toHaveBeenCalled();
  });

  it('cleans up map instance on unmount', async () => {
    const L = await import('leaflet');
    const { unmount } = render(
      <MapView
        bbox={bbox}
        ignitionPoints={[]}
        onAddIgnitionPoint={noop}
        onRemoveIgnitionPoint={noop}
      />
    );
    const mapInstance = vi.mocked(L.default.map).mock.results[0].value;
    unmount();
    expect(mapInstance.removeLayer).toHaveBeenCalled();
    expect(mapInstance.remove).toHaveBeenCalled();
  });
});