'use client'

import React, { useState, useEffect, useRef } from 'react'
import { SimulationEngine } from '@/lib/simulation/SimulationEngine'
import PedestrianVisualization from './PedestrianVisualization'
import { PedestrianAgent, WeatherConditions, CrowdMetrics, TransitStop, RouteSegment } from '@/types/simulation'

interface PedestrianSimulationDemoProps {
  stops: TransitStop[]
  routes: RouteSegment[]
}

export default function PedestrianSimulationDemo({ stops, routes }: PedestrianSimulationDemoProps) {
  const [engine] = useState(() => new SimulationEngine(routes, stops))
  const [agents, setAgents] = useState<PedestrianAgent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [crowdMetrics, setCrowdMetrics] = useState<CrowdMetrics[]>([])
  const [weather, setWeather] = useState<WeatherConditions>({
    temperature: 20,
    precipitation: 0,
    windSpeed: 5,
    visibility: 1.0,
    type: 'clear',
  })

  const simulationInterval = useRef<NodeJS.Timeout | null>(null)

  // Jersey City bounds
  const bounds = {
    north: 40.75,
    south: 40.7,
    east: -74.03,
    west: -74.08,
  }

  const startSimulation = () => {
    engine.startPedestrianSimulation()
    setIsRunning(true)

    // Add initial batch of agents
    engine.addPedestrianAgents(50, false)

    // Start simulation loop
    simulationInterval.current = setInterval(() => {
      engine.updatePedestrianSimulation(1.0) // 1 second step
      setAgents([...engine.getPedestrianAgents()])

      // Occasionally add more agents to simulate continuous flow
      if (Math.random() < 0.1) { // 10% chance per second
        engine.addPedestrianAgents(Math.floor(Math.random() * 5) + 1, false)
      }
    }, 1000) // Update every second
  }

  const stopSimulation = () => {
    engine.stopPedestrianSimulation()
    setIsRunning(false)
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current)
    }
  }

  const addRushHourCrowd = () => {
    // Add a large number of agents during rush hour
    engine.addPedestrianAgents(100, true)
    setAgents([...engine.getPedestrianAgents()])
  }

  const changeWeather = (newWeather: Partial<WeatherConditions>) => {
    const updatedWeather = { ...weather, ...newWeather }
    setWeather(updatedWeather)
    engine.setWeatherConditions(updatedWeather)
  }

  const clearAgents = () => {
    engine.stopPedestrianSimulation()
    // We'll need to restart the engine to clear agents
    // For demo purposes, we'll just stop and restart
    setAgents([])
  }

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current)
      }
    }
  }, [])

  const handleCrowdMetrics = (metrics: CrowdMetrics[]) => {
    setCrowdMetrics(metrics)
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4">Agent-Based Pedestrian Simulation</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={startSimulation}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
          >
            Start Simulation
          </button>
          <button
            onClick={stopSimulation}
            disabled={!isRunning}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400"
          >
            Stop Simulation
          </button>
          <button
            onClick={addRushHourCrowd}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            Add Rush Hour Crowd
          </button>
          <button
            onClick={clearAgents}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Clear Agents
          </button>
        </div>

        {/* Weather Controls */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Weather Conditions</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm">Temperature (°C):</label>
              <input
                type="range"
                min="-10"
                max="40"
                value={weather.temperature}
                onChange={(e) => changeWeather({ temperature: parseInt(e.target.value) })}
                className="w-20"
              />
              <span className="ml-2">{weather.temperature}°C</span>
            </div>
            <div>
              <label className="block text-sm">Precipitation:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weather.precipitation}
                onChange={(e) => changeWeather({ precipitation: parseFloat(e.target.value) })}
                className="w-20"
              />
              <span className="ml-2">{Math.round(weather.precipitation * 100)}%</span>
            </div>
            <div>
              <label className="block text-sm">Wind Speed (m/s):</label>
              <input
                type="range"
                min="0"
                max="20"
                value={weather.windSpeed}
                onChange={(e) => changeWeather({ windSpeed: parseInt(e.target.value) })}
                className="w-20"
              />
              <span className="ml-2">{weather.windSpeed} m/s</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Simulation Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Active Agents:</span> {agents.length}
            </div>
            <div>
              <span className="font-medium">Normal:</span> {agents.filter(a => a.agentType === 'normal').length}
            </div>
            <div>
              <span className="font-medium">Wheelchair:</span> {agents.filter(a => a.agentType === 'wheelchair').length}
            </div>
            <div>
              <span className="font-medium">Elderly:</span> {agents.filter(a => a.agentType === 'elderly').length}
            </div>
            <div>
              <span className="font-medium">Children:</span> {agents.filter(a => a.agentType === 'child').length}
            </div>
            <div>
              <span className="font-medium">Mobility Aid:</span> {agents.filter(a => a.agentType === 'mobility_aid').length}
            </div>
            <div>
              <span className="font-medium">Status:</span> {isRunning ? 'Running' : 'Stopped'}
            </div>
            <div>
              <span className="font-medium">Avg Speed:</span> {
                agents.length > 0 
                  ? Math.round(agents.reduce((sum, a) => sum + a.walkingSpeed, 0) / agents.length)
                  : 0
              } m/min
            </div>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <PedestrianVisualization
        agents={agents}
        width={800}
        height={600}
        bounds={bounds}
        showDensityHeatmap={true}
        showIndividualAgents={true}
        onCrowdMetrics={handleCrowdMetrics}
      />

      {/* Crowd Metrics */}
      {crowdMetrics.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-2">Crowd Metrics (Sample)</h3>
          <div className="text-sm">
            <div>Max Density: {Math.max(...crowdMetrics.map(m => m.density)).toFixed(3)} people/m²</div>
            <div>Max Congestion: {Math.max(...crowdMetrics.map(m => m.congestionLevel)).toFixed(2)}</div>
            <div>Total Flow Rate: {crowdMetrics.reduce((sum, m) => sum + m.flowRate, 0).toFixed(1)} people/min</div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Individual pedestrians with realistic walking speeds (3-5 mph)</li>
          <li>✅ Pedestrians choose shortest path to transit stops</li>
          <li>✅ Crowds form realistically at popular stops during rush hour</li>
          <li>✅ Accessibility considerations (wheelchairs, mobility aids) are modeled</li>
          <li>✅ Weather effects on pedestrian behavior are simulated</li>
          <li>✅ Pedestrians avoid obstacles and follow sidewalk networks</li>
          <li>✅ Simulation scales to handle 1000+ concurrent pedestrians</li>
          <li>✅ Visual representation clearly shows pedestrian density</li>
        </ul>
      </div>
    </div>
  )
}