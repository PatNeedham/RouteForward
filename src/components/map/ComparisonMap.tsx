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
import busRoutesData from '@/data/jersey-city/bus-routes.json'

// Components
import TimeSlider from './TimeSlider'
import SimulationControls, {
  SimulationControlConfig,
} from '@/components/simulation/SimulationControls'
import SimulationResults from '@/components/simulation/SimulationResults'

// Simulation Engine
import { SimulationEngine } from '@/lib/simulation/SimulationEngine'
import { RouteSegment, TransitStop, ComparisonResult } from '@/types/simulation'

// Hooks and utilities
import { MapState } from '@/types/mapState'
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

const GeomanControl = ({ onCreate }: { onCreate: (_e: any) => void }) => {
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
  isController = false,
}: {
  onViewportChange: (_center: [number, number], _zoom: number) => void
  currentViewport: { center: [number, number]; zoom: number }
  isController?: boolean
}) => {
  const map = useMapEvents({
    moveend: () => {
      if (isController) {
        const center = map.getCenter()
        const zoom = map.getZoom()
        onViewportChange([center.lat, center.lng], zoom)
      }
    },
    zoomend: () => {
      if (isController) {
        const center = map.getCenter()
        const zoom = map.getZoom()
        onViewportChange([center.lat, center.lng], zoom)
      }
    },
  })

  // Update map view when viewport state changes (e.g., from URL)
  // Only sync viewport from URL state if this is the controller map
  useEffect(() => {
    if (!isController) return

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
  }, [map, currentViewport, isController])

  return null
}

interface ComparisonMapProps {
  mapState: MapState
  updateMapState: (_partial: Partial<MapState>) => void
  shareableUrl: string
  isValidUrl: boolean
  resetToDefault: () => void
}

const ComparisonMap: React.FC<ComparisonMapProps> = ({
  mapState,
  updateMapState,
  shareableUrl: _shareableUrl,
  isValidUrl,
  resetToDefault,
}) => {
  // Local state for tracking initialization
  const [isInitialized, setIsInitialized] = useState(false)
  const [simulationResult, setSimulationResult] =
    useState<ComparisonResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (feature.properties?.name) {
      // Create tooltip content
      const tooltipContent = `
        <div class="font-semibold">${feature.properties.name}</div>
        ${feature.properties.description ? `<div class="text-sm text-gray-600">${feature.properties.description}</div>` : ''}
      `

      // Bind tooltip that shows on hover
      layer.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip',
      })

      // Optional: Still bind popup for click (for detailed info)
      layer.bindPopup(tooltipContent)

      // Add hover effects
      layer.on({
        mouseover: function (e) {
          const target = e.target
          target.setStyle({
            weight: 6,
            opacity: 1.0,
          })
          target.openTooltip()
        },
        mouseout: function (e) {
          const target = e.target
          // Reset style based on feature type
          if (feature.properties?.color) {
            // Bus route - reset to original style
            target.setStyle({
              color: feature.properties.color,
              weight: 3,
              opacity: 0.8,
            })
          } else {
            // Other features - use default reset
            target.setStyle({
              weight: 3,
              opacity: 0.8,
            })
          }
          target.closeTooltip()
        },
      })
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

  const busRouteStyle = (feature: any) => {
    return {
      color: feature?.properties?.color || '#4682B4',
      weight: 4,
      opacity: 0.8,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    }
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

  // Convert GeoJSON data to simulation format
  const convertToRouteSegments = (
    data: any,
    routeType: 'bus' | 'rail' = 'bus',
  ): RouteSegment[] => {
    if (!data || !data.features) return []

    return data.features.map((feature: any, index: number) => ({
      id: `route-${index}`,
      name: feature.properties?.name || `Route ${index + 1}`,
      coordinates: feature.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          lat,
          lng,
        }),
      ),
      color: feature.properties?.color,
      type: routeType,
    }))
  }

  // Generate transit stops from route data
  const generateTransitStops = (routes: RouteSegment[]): TransitStop[] => {
    const stops: TransitStop[] = []

    routes.forEach((route, _routeIndex) => {
      // Add stops at the beginning, middle, and end of each route
      const coords = route.coordinates
      const stopPositions = [
        0,
        Math.floor(coords.length / 2),
        coords.length - 1,
      ]

      stopPositions.forEach((pos, stopIndex) => {
        if (pos < coords.length) {
          stops.push({
            id: `${route.id}-stop-${stopIndex}`,
            name: `${route.name} Stop ${stopIndex + 1}`,
            location: coords[pos],
            routes: [route.name],
            type: route.type === 'rail' ? 'rail' : 'bus',
          })
        }
      })
    })

    return stops
  }

  // Handle simulation run
  const handleRunSimulation = async (config: SimulationControlConfig) => {
    setIsSimulating(true)
    setShowSimulation(true)

    try {
      // Convert current routes to simulation format
      const currentRoutes = [
        ...convertToRouteSegments(busRoutesData),
        ...convertToRouteSegments(hblrData, 'rail'),
      ]

      // Convert proposed routes (current + new routes)
      const proposedRoutes = [
        ...currentRoutes,
        ...convertToRouteSegments(mapState.routes),
      ]

      // Generate stops
      const currentStops = generateTransitStops(currentRoutes)
      const proposedStops = [
        ...currentStops,
        ...generateTransitStops(convertToRouteSegments(mapState.routes)),
      ]

      // Create simulation engine
      const engine = new SimulationEngine(currentRoutes, currentStops)

      // Generate sample trips
      const trips = engine.generateSampleTrips(config.tripCount)

      // Run comparison simulation
      const result = await engine.compareScenarios(
        trips,
        proposedRoutes,
        proposedStops,
        config.timeOfDay,
      )

      setSimulationResult(result)
    } catch (error) {
      console.error('Simulation failed:', error)
      // You could add error handling UI here
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full">
      {/* Maps Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 flex-1 p-2 sm:p-4">
          {/* Current State Map */}
          <div className="flex flex-col h-full rounded-lg overflow-hidden">
            <h2 className="text-center text-lg sm:text-xl font-bold mb-2 flex-shrink-0">
              Current State
            </h2>
            <div className="flex-grow relative min-h-64 sm:min-h-80">
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
                <GeoJSON
                  data={busRoutesData as GeoJSONObject}
                  style={busRouteStyle}
                  onEachFeature={onEachFeature}
                />
                <MapViewportSync
                  onViewportChange={handleViewportChange}
                  currentViewport={mapState.viewport}
                  isController={true}
                />
              </MapContainer>
            </div>
          </div>

          {/* Enhanced Transit Map */}
          <div className="flex flex-col h-full rounded-lg overflow-hidden">
            <h2 className="text-center text-lg sm:text-xl font-bold mb-2 flex-shrink-0">
              Enhanced Transit
            </h2>
            <div className="flex-grow relative min-h-64 sm:min-h-80">
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
                <GeoJSON
                  data={busRoutesData as GeoJSONObject}
                  style={busRouteStyle}
                  onEachFeature={onEachFeature}
                />
                <GeoJSON data={mapState.routes} style={newRouteStyle} />
                <GeomanControl onCreate={handleRouteCreate} />
                <MapViewportSync
                  onViewportChange={handleViewportChange}
                  currentViewport={mapState.viewport}
                  isController={false}
                />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* TimeSlider - positioned relative to maps section, not absolute */}
        <div className="flex-shrink-0 px-2 sm:px-4 pb-2 sm:pb-4">
          <TimeSlider
            value={mapState.simulation.time}
            onChange={handleTimeChange}
          />
        </div>
      </div>

      {/* Simulation Panel - Responsive layout */}
      <div className="w-full lg:w-96 flex flex-col bg-gray-100 border-t lg:border-t-0 lg:border-l border-gray-300 h-auto lg:h-full overflow-hidden max-h-screen">
        <div className="flex border-b border-gray-300 flex-shrink-0">
          <button
            onClick={() => setShowSimulation(false)}
            className={`flex-1 px-3 sm:px-4 py-2 text-sm font-medium ${
              !showSimulation
                ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:text-gray-800'
            }`}
          >
            Draw Routes
          </button>
          <button
            onClick={() => setShowSimulation(true)}
            className={`flex-1 px-3 sm:px-4 py-2 text-sm font-medium ${
              showSimulation
                ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:text-gray-800'
            }`}
          >
            Simulation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          {!showSimulation ? (
            <div className="text-gray-600">
              <h3 className="text-lg font-semibold mb-3">Draw New Routes</h3>
              <p className="text-sm mb-4">
                Use the drawing tools on the Enhanced Transit map to add new
                transit routes. Click the line tool in the map controls to start
                drawing.
              </p>
              {mapState.routes.features.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Added Routes:</h4>
                  <ul className="text-sm space-y-1">
                    {mapState.routes.features.map((feature, index) => (
                      <li
                        key={`route-${feature.geometry?.coordinates?.[0]?.[0]}-${feature.geometry?.coordinates?.[0]?.[1]}-${index}`}
                        className="text-green-600"
                      >
                        • New Route {index + 1}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <SimulationControls
                onRunSimulation={handleRunSimulation}
                isLoading={isSimulating}
              />
              <SimulationResults
                result={simulationResult}
                isLoading={isSimulating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComparisonMap
