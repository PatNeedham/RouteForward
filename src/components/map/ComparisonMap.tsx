'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  FeatureGroup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import L, { Layer, PathOptions, StyleFunction } from 'leaflet'
import {
  Feature,
  FeatureCollection,
  GeoJSON as GeoJSONObject,
  LineString,
} from 'geojson'

// Data
import hblrData from '@/data/jersey-city/hblr.json'
import streetNetworkData from '@/data/jersey-city/street-network.json'

// Components
import TimeSlider from './TimeSlider'
import ShareButton from './ShareButton'

// Hooks and utilities
import { useUrlState } from '@/hooks/useUrlState'
import { semanticColors } from '@/config/colors'

// Leaflet Icon workaround
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
})

// Type definitions
type StreetNetworkProperties = {
  name: string
  traffic: { [key: string]: 'heavy' | 'medium' | 'light' }
}

type StreetFeature = Feature<LineString, StreetNetworkProperties>

const trafficColorMapping: { [key: string]: string } = semanticColors.traffic

const GeomanControl = ({ onCreate }: { onCreate: (e: any) => void }) => {
  const map = useMap()

  useEffect(() => {
    // Import Geoman on the client side after the map is available
    const initializeGeoman = async () => {
      try {
        // Wait for the dynamic import to complete
        await import('@geoman-io/leaflet-geoman-free')

        // Now we can safely access map.pm
        if (map.pm) {
          // Initialize Geoman controls
          map.pm.addControls({
            position: 'topright',
            drawPolygon: false,
            drawMarker: false,
            drawCircleMarker: false,
            drawRectangle: false,
            drawCircle: false,
            drawText: false,
            cutPolygon: false,
            editMode: false,
            dragMode: false,
            rotateMode: false,
          })

          // Event listener for when a new shape is created
          map.on('pm:create', (e) => {
            if (e.shape === 'Line') {
              onCreate(e)
            }
          })
        }
      } catch (error) {
        console.error('Failed to load Geoman library:', error)
      }
    }

    initializeGeoman()

    // Cleanup function
    return () => {
      if (map.pm) {
        map.pm.removeControls()
        map.off('pm:create')
      }
    }
  }, [map, onCreate])

  return null
}

const MapViewportSync = ({
  onViewportChange,
  currentViewport,
}: {
  onViewportChange: (center: [number, number], zoom: number) => void
  currentViewport: { center: [number, number]; zoom: number }
}) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      onViewportChange([center.lat, center.lng], zoom)
    },
    zoomend: () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      onViewportChange([center.lat, center.lng], zoom)
    },
  })

  // Update map view when viewport state changes (e.g., from URL)
  useEffect(() => {
    const mapCenter = map.getCenter()
    const mapZoom = map.getZoom()
    const [stateLat, stateLng] = currentViewport.center

    // Only update if there's a significant difference to avoid infinite loops
    const centerDiff =
      Math.abs(mapCenter.lat - stateLat) + Math.abs(mapCenter.lng - stateLng)
    const zoomDiff = Math.abs(mapZoom - currentViewport.zoom)

    if (centerDiff > 0.001 || zoomDiff > 0.1) {
      map.setView(currentViewport.center, currentViewport.zoom)
    }
  }, [map, currentViewport])

  return null
}

const ComparisonMap: React.FC = () => {
  // Use the new URL state management hook
  const { mapState, updateMapState, shareableUrl, isValidUrl, resetToDefault } =
    useUrlState({
      enableHistory: true,
      debounceMs: 300,
    })

  // Local state for tracking initialization
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(feature.properties.name)
    }
  }

  const getTrafficLevel = (feature: StreetFeature) => {
    if (!feature.properties.traffic) return 'light'
    const times = Object.keys(feature.properties.traffic).sort()
    let applicableTime = times[0]
    for (const time of times) {
      if (mapState.simulation.time >= time) {
        applicableTime = time
      } else {
        break
      }
    }
    return feature.properties.traffic[applicableTime]
  }

  const streetNetworkStyle: StyleFunction<StreetNetworkProperties> = (
    feature,
  ) => {
    if (feature) {
      const trafficLevel = getTrafficLevel(feature as StreetFeature)
      return {
        color: trafficColorMapping[trafficLevel] || '#ffffff',
        weight: 4,
        opacity: 0.9,
      }
    }
    return {}
  }

  const hblrStyle: PathOptions = {
    color: semanticColors.routes.hblr,
    weight: 3,
    opacity: 0.8,
  }
  const newRouteStyle: PathOptions = {
    color: semanticColors.routes.newRoute,
    weight: 5,
    opacity: 1,
  }

  const handleRouteCreate = useCallback(
    (e: any) => {
      if (e.layer && e.layer instanceof L.Polyline) {
        const geojson = e.layer.toGeoJSON() as Feature<LineString>
        const updatedRoutes: FeatureCollection<LineString> = {
          ...mapState.routes,
          features: [...mapState.routes.features, geojson],
        }
        updateMapState({ routes: updatedRoutes })
      }
    },
    [mapState.routes, updateMapState],
  )

  const handleTimeChange = useCallback(
    (newTime: string) => {
      updateMapState({
        simulation: { ...mapState.simulation, time: newTime },
      })
    },
    [mapState.simulation, updateMapState],
  )

  const handleViewportChange = useCallback(
    (center: [number, number], zoom: number) => {
      // Only update state if we're not in the initial loading phase
      // and the values have actually changed
      if (isInitialized) {
        const currentCenter = mapState.viewport.center
        const currentZoom = mapState.viewport.zoom

        // Check if the viewport has actually changed to avoid unnecessary updates
        const centerDiff =
          Math.abs(currentCenter[0] - center[0]) +
          Math.abs(currentCenter[1] - center[1])
        const zoomDiff = Math.abs(currentZoom - zoom)

        if (centerDiff > 0.001 || zoomDiff > 0.1) {
          updateMapState({
            viewport: { center, zoom },
          })
        }
      }
    },
    [updateMapState, isInitialized, mapState.viewport],
  )

  // Handle invalid URL state
  if (!isValidUrl) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-red-400">
            Invalid URL State
          </h2>
          <p className="text-gray-300 mb-4">
            The shared URL contains invalid or corrupted data.
          </p>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reset to Default
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Share Button - positioned relative to the main container */}
      <ShareButton
        shareableUrl={shareableUrl}
        className="absolute top-4 right-4 z-[1000]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full w-full p-4">
        {/* Current State Map */}
        <div className="flex flex-col h-full rounded-lg overflow-hidden">
          <h2 className="text-center text-xl font-bold mb-2 flex-shrink-0">
            Current State
          </h2>
          <div className="flex-grow relative">
            <MapContainer
              center={mapState.viewport.center}
              zoom={mapState.viewport.zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {mapState.layers?.streetNetwork && (
                <GeoJSON
                  key={`current-${mapState.simulation.time}`}
                  data={streetNetworkData as GeoJSONObject}
                  style={streetNetworkStyle}
                  onEachFeature={onEachFeature}
                />
              )}
              {mapState.layers?.hblr && (
                <GeoJSON
                  data={hblrData as GeoJSONObject}
                  style={hblrStyle}
                  onEachFeature={onEachFeature}
                />
              )}
              <MapViewportSync
                onViewportChange={handleViewportChange}
                currentViewport={mapState.viewport}
              />
            </MapContainer>
          </div>
        </div>

        {/* Enhanced Transit Map */}
        <div className="flex flex-col h-full rounded-lg overflow-hidden">
          <h2 className="text-center text-xl font-bold mb-2 flex-shrink-0">
            Enhanced Transit
          </h2>
          <div className="flex-grow relative">
            <MapContainer
              center={mapState.viewport.center}
              zoom={mapState.viewport.zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <FeatureGroup>
                {/* This is where the drawing controls are added */}
              </FeatureGroup>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {mapState.layers?.streetNetwork && (
                <GeoJSON
                  key={`enhanced-${mapState.simulation.time}`}
                  data={streetNetworkData as GeoJSONObject}
                  style={streetNetworkStyle}
                  onEachFeature={onEachFeature}
                />
              )}
              {mapState.layers?.hblr && (
                <GeoJSON
                  data={hblrData as GeoJSONObject}
                  style={hblrStyle}
                  onEachFeature={onEachFeature}
                />
              )}
              <GeoJSON data={mapState.routes} style={newRouteStyle} />
              <GeomanControl onCreate={handleRouteCreate} />
              <MapViewportSync
                onViewportChange={handleViewportChange}
                currentViewport={mapState.viewport}
              />
            </MapContainer>
          </div>
        </div>
      </div>
      <TimeSlider
        value={mapState.simulation.time}
        onChange={handleTimeChange}
      />
    </div>
  )
}

export default ComparisonMap
