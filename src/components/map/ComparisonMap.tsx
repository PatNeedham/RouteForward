'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  FeatureGroup,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import L, { Layer, PathOptions, StyleFunction } from 'leaflet'
import pako from 'pako'
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
import SimulationControls, { SimulationControlConfig } from '@/components/simulation/SimulationControls'
import SimulationResults from '@/components/simulation/SimulationResults'

// Simulation Engine
import { SimulationEngine } from '@/lib/simulation/SimulationEngine'
import { RouteSegment, TransitStop, ComparisonResult } from '@/types/simulation'

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

const trafficColorMapping: { [key: string]: string } = {
  heavy: '#dc2626', // red-600
  medium: '#f59e0b', // amber-500
  light: '#facc15', // yellow-400
}

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

const ComparisonMap: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [simTime, setSimTime] = useState('08:00')
  const [newRoutes, setNewRoutes] = useState<FeatureCollection<LineString>>({
    type: 'FeatureCollection',
    features: [],
  })
  const [simulationResult, setSimulationResult] = useState<ComparisonResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)

  // Decode routes from URL on initial load
  useEffect(() => {
    const routesParam = searchParams.get('routes')
    if (routesParam) {
      try {
        const decoded = atob(routesParam)
        // Convert binary string to Uint8Array
        const charData = decoded.split('').map((x) => x.charCodeAt(0))
        const binData = new Uint8Array(charData)
        const decompressed = pako.inflate(binData, { to: 'string' })
        setNewRoutes(JSON.parse(decompressed))
      } catch (error) {
        console.error('Failed to decode routes from URL:', error)
      }
    }
  }, [searchParams])

  // Update URL when routes change
  const updateUrlWithRoutes = useCallback(
    (routes: FeatureCollection<LineString>) => {
      if (routes.features.length > 0) {
        const jsonString = JSON.stringify(routes)
        const compressed = pako.deflate(jsonString)
        // Convert Uint8Array to binary string for btoa
        const binaryString = String.fromCharCode.apply(
          null,
          Array.from(compressed),
        )
        const encoded = btoa(binaryString)
        const params = new URLSearchParams(searchParams.toString())
        params.set('routes', encoded)
        router.replace(`${pathname}?${params.toString()}`)
      }
    },
    [router, pathname, searchParams],
  )

  const position: [number, number] = [40.7282, -74.0776]

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
      if (simTime >= time) {
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

  const hblrStyle: PathOptions = { color: '#00AEEF', weight: 3, opacity: 0.8 }
  const newRouteStyle: PathOptions = { color: '#32CD32', weight: 5, opacity: 1 }

  const _onCreate = (e: any) => {
    if (e.layer && e.layer instanceof L.Polyline) {
      const geojson = e.layer.toGeoJSON() as Feature<LineString>
      const updatedRoutes: FeatureCollection<LineString> = {
        ...newRoutes,
        features: [...newRoutes.features, geojson],
      }
      setNewRoutes(updatedRoutes)
      updateUrlWithRoutes(updatedRoutes)
    }
  }

  // Convert GeoJSON data to simulation format
  const convertToRouteSegments = (data: any): RouteSegment[] => {
    if (!data || !data.features) return []
    
    return data.features.map((feature: any, index: number) => ({
      id: `route-${index}`,
      name: feature.properties?.name || `Route ${index + 1}`,
      coordinates: feature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
        lat,
        lng
      })),
      color: feature.properties?.color,
      type: 'bus' as const
    }))
  }

  // Generate transit stops from route data
  const generateTransitStops = (routes: RouteSegment[]): TransitStop[] => {
    const stops: TransitStop[] = []
    
    routes.forEach((route, routeIndex) => {
      // Add stops at the beginning, middle, and end of each route
      const coords = route.coordinates
      const stopPositions = [0, Math.floor(coords.length / 2), coords.length - 1]
      
      stopPositions.forEach((pos, stopIndex) => {
        if (pos < coords.length) {
          stops.push({
            id: `${route.id}-stop-${stopIndex}`,
            name: `${route.name} Stop ${stopIndex + 1}`,
            location: coords[pos],
            routes: [route.name],
            type: 'bus'
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
        ...convertToRouteSegments(hblrData)
      ]
      
      // Convert proposed routes (current + new routes)
      const proposedRoutes = [
        ...currentRoutes,
        ...convertToRouteSegments(newRoutes)
      ]
      
      // Generate stops
      const currentStops = generateTransitStops(currentRoutes)
      const proposedStops = [
        ...currentStops,
        ...generateTransitStops(convertToRouteSegments(newRoutes))
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
        config.timeOfDay
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
    <>
      <div className="flex h-full w-full">
        {/* Maps Section */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 p-4">
            {/* Current State Map */}
            <div className="flex flex-col h-full rounded-lg overflow-hidden">
              <h2 className="text-center text-xl font-bold mb-2 flex-shrink-0">
                Current State
              </h2>
              <div className="flex-grow relative">
                <MapContainer
                  center={position}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <GeoJSON
                    key={`current-${simTime}`}
                    data={streetNetworkData as GeoJSONObject}
                    style={streetNetworkStyle}
                    onEachFeature={onEachFeature}
                  />
                  <GeoJSON
                    data={hblrData as GeoJSONObject}
                    style={hblrStyle}
                    onEachFeature={onEachFeature}
                  />
                  <GeoJSON
                    data={busRoutesData as GeoJSONObject}
                    style={{ color: '#4682B4', weight: 3, opacity: 0.8 }}
                    onEachFeature={onEachFeature}
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
                  center={position}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <FeatureGroup>
                    {/* This is where the drawing controls are added */}
                  </FeatureGroup>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <GeoJSON
                    key={`enhanced-${simTime}`}
                    data={streetNetworkData as GeoJSONObject}
                    style={streetNetworkStyle}
                    onEachFeature={onEachFeature}
                  />
                  <GeoJSON
                    data={hblrData as GeoJSONObject}
                    style={hblrStyle}
                    onEachFeature={onEachFeature}
                  />
                  <GeoJSON
                    data={busRoutesData as GeoJSONObject}
                    style={{ color: '#4682B4', weight: 3, opacity: 0.8 }}
                    onEachFeature={onEachFeature}
                  />
                  <GeoJSON data={newRoutes} style={newRouteStyle} />
                  <GeomanControl onCreate={_onCreate} />
                </MapContainer>
              </div>
            </div>
          </div>
          <TimeSlider onChange={setSimTime} />
        </div>

        {/* Simulation Panel */}
        <div className="w-96 flex flex-col bg-gray-100 border-l border-gray-300">
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setShowSimulation(false)}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                !showSimulation
                  ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-800'
              }`}
            >
              Draw Routes
            </button>
            <button
              onClick={() => setShowSimulation(true)}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                showSimulation
                  ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-800'
              }`}
            >
              Simulation
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {!showSimulation ? (
              <div className="text-gray-600">
                <h3 className="text-lg font-semibold mb-3">Draw New Routes</h3>
                <p className="text-sm mb-4">
                  Use the drawing tools on the Enhanced Transit map to add new transit routes. 
                  Click the line tool in the map controls to start drawing.
                </p>
                {newRoutes.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Added Routes:</h4>
                    <ul className="text-sm space-y-1">
                      {newRoutes.features.map((_, index) => (
                        <li key={index} className="text-green-600">
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
    </>
  )
}

export default ComparisonMap
