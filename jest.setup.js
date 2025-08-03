import '@testing-library/jest-dom'
import React from 'react'

// Mock Leaflet module since it doesn't work well in Node.js environment
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
    },
  },
  Map: jest.fn(),
  Polyline: jest.fn(),
}))

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) =>
    React.createElement('div', { 'data-testid': 'map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
  GeoJSON: () => React.createElement('div', { 'data-testid': 'geojson' }),
  FeatureGroup: ({ children }) =>
    React.createElement('div', { 'data-testid': 'feature-group' }, children),
  useMap: () => ({
    getCenter: () => ({ lat: 40.7281, lng: -74.0775 }),
    getZoom: () => 13,
    setView: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    pm: {
      addControls: jest.fn(),
      removeControls: jest.fn(),
    },
  }),
  useMapEvents: (events) => {
    const map = {
      getCenter: () => ({ lat: 40.7281, lng: -74.0775 }),
      getZoom: () => 13,
      setView: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }
    // Simulate calling the events passed to useMapEvents
    if (events) {
      Object.keys(events).forEach((eventName) => {
        if (typeof events[eventName] === 'function') {
          // Don't actually call the events, just make them available
        }
      })
    }
    return map
  },
}))

// Mock geoman
jest.mock('@geoman-io/leaflet-geoman-free', () => ({}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/map/jersey-city',
}))
