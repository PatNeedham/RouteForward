'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { SimulationEngine } from '@/lib/simulation/SimulationEngine'
import { PedestrianAgent, RouteSegment, TransitStop, Point } from '@/types/simulation'

interface PedestrianMapOverlayProps {
  routes: RouteSegment[]
  stops: TransitStop[]
  showDensityHeatmap?: boolean
}

export default function PedestrianMapOverlay({ 
  routes, 
  stops, 
  showDensityHeatmap = true 
}: PedestrianMapOverlayProps) {
  const map = useMap()
  const [engine] = useState(() => new SimulationEngine(routes, stops))
  const [agents, setAgents] = useState<PedestrianAgent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const simulationInterval = useRef<NodeJS.Timeout | null>(null)
  const canvasElement = useRef<HTMLCanvasElement | null>(null)
  const canvasContainer = useRef<HTMLDivElement | null>(null)
  const gridResolution = 20

  // Convert lat/lng to canvas pixel coordinates
  const latLngToPixel = useCallback((point: Point): L.Point => {
    return map.latLngToContainerPoint([point.lat, point.lng])
  }, [map])

  const drawDensityHeatmap = useCallback((ctx: CanvasRenderingContext2D) => {
    const bounds = map.getBounds()
    const cellWidth = (bounds.getEast() - bounds.getWest()) / gridResolution
    const cellHeight = (bounds.getNorth() - bounds.getSouth()) / gridResolution

    // Create density grid
    const grid: number[][] = Array(gridResolution)
      .fill(0)
      .map(() => Array(gridResolution).fill(0))

    // Count agents in each grid cell
    for (const agent of agents) {
      const cellX = Math.floor(
        ((agent.currentPosition.lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest())) * gridResolution
      )
      const cellY = Math.floor(
        ((bounds.getNorth() - agent.currentPosition.lat) / (bounds.getNorth() - bounds.getSouth())) * gridResolution
      )

      if (cellX >= 0 && cellX < gridResolution && cellY >= 0 && cellY < gridResolution) {
        grid[cellY][cellX]++
      }
    }

    // Find max density for normalization
    const maxDensity = Math.max(...grid.flat())
    if (maxDensity === 0) return

    // Draw density heatmap
    for (let y = 0; y < gridResolution; y++) {
      for (let x = 0; x < gridResolution; x++) {
        const density = grid[y][x]
        if (density === 0) continue

        const normalizedDensity = density / maxDensity
        
        // Color based on density (green = low, red = high)
        const red = Math.floor(255 * normalizedDensity)
        const green = Math.floor(255 * (1 - normalizedDensity))
        const alpha = 0.3 * normalizedDensity

        const cellLat = bounds.getNorth() - (y + 0.5) * cellHeight
        const cellLng = bounds.getWest() + (x + 0.5) * cellWidth
        
        const topLeft = latLngToPixel({ lat: cellLat + cellHeight/2, lng: cellLng - cellWidth/2 })
        const bottomRight = latLngToPixel({ lat: cellLat - cellHeight/2, lng: cellLng + cellWidth/2 })

        ctx.fillStyle = `rgba(${red}, ${green}, 0, ${alpha})`
        ctx.fillRect(
          topLeft.x,
          topLeft.y,
          bottomRight.x - topLeft.x,
          bottomRight.y - topLeft.y
        )
      }
    }
  }, [map, agents, latLngToPixel])

  // Draw agents and density heatmap on canvas
  const drawSimulation = useCallback(() => {
    if (!canvasElement.current) return

    const canvas = canvasElement.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Update canvas size to match map container
    const mapContainer = map.getContainer()
    canvas.width = mapContainer.clientWidth
    canvas.height = mapContainer.clientHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw density heatmap if enabled
    if (showDensityHeatmap) {
      drawDensityHeatmap(ctx)
    }

    // Draw individual agents
    agents.forEach(agent => {
      const pixelPos = latLngToPixel(agent.currentPosition)
      
      // Agent color based on type
      let color = '#4A90E2' // Default blue
      switch (agent.agentType) {
        case 'wheelchair':
          color = '#E24A4A' // Red
          break
        case 'mobility_aid':
          color = '#E2A24A' // Orange
          break
        case 'elderly':
          color = '#A24AE2' // Purple
          break
        case 'child':
          color = '#4AE2A2' // Green
          break
      }

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(pixelPos.x, pixelPos.y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Draw direction indicator
      if (agent.velocity.x !== 0 || agent.velocity.y !== 0) {
        const speed = Math.sqrt(agent.velocity.x * agent.velocity.x + agent.velocity.y * agent.velocity.y)
        if (speed > 0.1) {
          const dirX = agent.velocity.x / speed
          const dirY = agent.velocity.y / speed
          
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(pixelPos.x, pixelPos.y)
          ctx.lineTo(pixelPos.x + dirX * 8, pixelPos.y + dirY * 8)
          ctx.stroke()
        }
      }
    })
  }, [agents, showDensityHeatmap, latLngToPixel, map, drawDensityHeatmap])

  const startSimulation = useCallback(() => {
    if (isRunning) return

    engine.startPedestrianSimulation()
    setIsRunning(true)

    // Add initial batch of agents
    engine.addPedestrianAgents(50, false)

    // Start simulation loop
    simulationInterval.current = setInterval(() => {
      engine.updatePedestrianSimulation(1.0)
      setAgents([...engine.getPedestrianAgents()])

      // Occasionally add more agents
      if (Math.random() < 0.1) {
        engine.addPedestrianAgents(Math.floor(Math.random() * 3) + 1, false)
      }
    }, 100) // 10 FPS
  }, [engine, isRunning])

  const stopSimulation = useCallback(() => {
    if (!isRunning) return

    engine.stopPedestrianSimulation()
    setIsRunning(false)

    if (simulationInterval.current) {
      clearInterval(simulationInterval.current)
      simulationInterval.current = null
    }
  }, [engine, isRunning])

  useEffect(() => {
    // Create canvas overlay
    const mapContainer = map.getContainer()
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '400'

    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    container.appendChild(canvas)
    mapContainer.appendChild(container)

    canvasContainer.current = container
    canvasElement.current = canvas

    // Auto-start simulation
    startSimulation()

    return () => {
      stopSimulation()
      if (canvasContainer.current && canvasContainer.current.parentNode) {
        canvasContainer.current.parentNode.removeChild(canvasContainer.current)
      }
    }
  }, [map, startSimulation, stopSimulation])

  useEffect(() => {
    drawSimulation()
  }, [drawSimulation])

  // Redraw when map moves or zooms
  useEffect(() => {
    const handleMapChange = () => {
      drawSimulation()
    }

    map.on('move', handleMapChange)
    map.on('zoom', handleMapChange)
    map.on('resize', handleMapChange)

    return () => {
      map.off('move', handleMapChange)
      map.off('zoom', handleMapChange)
      map.off('resize', handleMapChange)
    }
  }, [map, drawSimulation])

  return null // This component doesn't render anything directly
}