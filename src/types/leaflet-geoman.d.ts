/* eslint-disable no-unused-vars */
import { PM } from '@geoman-io/leaflet-geoman-free'

declare module 'leaflet' {
  interface Map {
    pm: PM.Map
  }
}
