import 'leaflet'
import { PM } from '@geoman-io/leaflet-geoman-free'

declare module 'leaflet' {
  interface Map {
    pm: PM.Map
  }

  interface LeafletEvent {
    shape?: string
  }
}
