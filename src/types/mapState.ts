import { FeatureCollection, LineString } from 'geojson'

export interface MapViewport {
  center: [number, number]
  zoom: number
}

export interface SimulationSettings {
  time: string
  // Future extensibility for speed, mode, etc.
  speed?: number
  mode?: string
}

export interface MapState {
  viewport: MapViewport
  routes: FeatureCollection<LineString>
  simulation: SimulationSettings
  layers?: {
    streetNetwork?: boolean
    hblr?: boolean
    // Future layer toggles
  }
}

export interface EncodedMapState {
  v?: string // viewport (base64 encoded)
  r?: string // routes (base64 encoded with compression)
  t?: string // time
  s?: string // speed
  m?: string // mode
  l?: string // layers (comma-separated)
}

export const DEFAULT_MAP_STATE: MapState = {
  viewport: {
    center: [40.7282, -74.0776],
    zoom: 13,
  },
  routes: {
    type: 'FeatureCollection',
    features: [],
  },
  simulation: {
    time: '08:00',
  },
  layers: {
    streetNetwork: true,
    hblr: true,
  },
}
