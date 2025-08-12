'use client'

import React, { useEffect, useRef, useState } from 'react'
import { PedestrianAgent, Point, CrowdMetrics } from '@/types/simulation'

interface PedestrianVisualizationProps {
  agents: PedestrianAgent[]
  width: number
  height: number
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  showDensityHeatmap?: boolean
  showIndividualAgents?: boolean
  onCrowdMetrics?: (_metrics: CrowdMetrics[]) => void
}

export default function PedestrianVisualization({
  agents,
  width,
  height,
  bounds,
  showDensityHeatmap = true,
  showIndividualAgents = true,
  onCrowdMetrics,
}: PedestrianVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [densityGrid, setDensityGrid] = useState<number[][]>([])
  const gridResolution = 20 // Grid cells per side

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = React.useCallback((point: Point): { x: number; y: number } => {
    const x = ((point.lng - bounds.west) / (bounds.east - bounds.west)) * width
    const y = ((bounds.north - point.lat) / (bounds.north - bounds.south)) * height
    return { x, y }
  }, [bounds.west, bounds.east, bounds.north, bounds.south, width, height])

  // Calculate density grid
  useEffect(() => {
    const grid: number[][] = Array(gridResolution)
      .fill(0)
      .map(() => Array(gridResolution).fill(0))

    const cellWidth = (bounds.east - bounds.west) / gridResolution
    const cellHeight = (bounds.north - bounds.south) / gridResolution

    // Count agents in each grid cell
    for (const agent of agents) {
      const cellX = Math.floor(
        ((agent.currentPosition.lng - bounds.west) / (bounds.east - bounds.west)) *
          gridResolution,
      )
      const cellY = Math.floor(
        ((bounds.north - agent.currentPosition.lat) / (bounds.north - bounds.south)) *
          gridResolution,
      )

      if (cellX >= 0 && cellX < gridResolution && cellY >= 0 && cellY < gridResolution) {
        grid[cellY][cellX]++
      }
    }

    setDensityGrid(grid)

    // Calculate crowd metrics for each cell
    if (onCrowdMetrics) {
      const metrics: CrowdMetrics[] = []
      for (let y = 0; y < gridResolution; y++) {
        for (let x = 0; x < gridResolution; x++) {
          // Calculate cell center (unused for now)
          // const cellLat = bounds.north - (y + 0.5) * cellHeight
          // const cellLng = bounds.west + (x + 0.5) * cellWidth

          // Calculate cell area in square meters (approximate)
          const cellAreaM2 = cellWidth * 111320 * cellHeight * 110540

          const agentsInCell = grid[y][x]
          const density = agentsInCell / cellAreaM2

          // Calculate average speed for agents in this cell
          const cellAgents = agents.filter((agent) => {
            const agentCellX = Math.floor(
              ((agent.currentPosition.lng - bounds.west) /
                (bounds.east - bounds.west)) *
                gridResolution,
            )
            const agentCellY = Math.floor(
              ((bounds.north - agent.currentPosition.lat) /
                (bounds.north - bounds.south)) *
                gridResolution,
            )
            return agentCellX === x && agentCellY === y
          })

          const averageSpeed =
            cellAgents.length > 0
              ? cellAgents.reduce((sum, agent) => {
                  const speed = Math.sqrt(
                    agent.velocity.x * agent.velocity.x +
                      agent.velocity.y * agent.velocity.y,
                  )
                  return sum + speed
                }, 0) / cellAgents.length
              : 0

          metrics.push({
            density,
            averageSpeed,
            flowRate: density * averageSpeed * 60, // people per minute
            congestionLevel: Math.min(density / 0.5, 1), // Assume max comfortable density is 0.5 people/m²
          })
        }
      }
      onCrowdMetrics(metrics)
    }
  }, [agents, bounds, gridResolution, onCrowdMetrics, latLngToCanvas])

  // Render the visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw density heatmap
    if (showDensityHeatmap && densityGrid.length > 0) {
      const cellWidth = width / gridResolution
      const cellHeight = height / gridResolution
      const maxDensity = Math.max(...densityGrid.flat())

      for (let y = 0; y < gridResolution; y++) {
        for (let x = 0; x < gridResolution; x++) {
          const density = densityGrid[y][x]
          if (density > 0) {
            const alpha = Math.min(density / Math.max(maxDensity, 5), 0.8) // Normalize to max 5 people per cell
            const intensity = density / Math.max(maxDensity, 5)

            // Color from blue (low density) to red (high density)
            const red = Math.floor(255 * intensity)
            const blue = Math.floor(255 * (1 - intensity))
            const green = Math.floor(128 * (1 - intensity))

            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight)
          }
        }
      }
    }

    // Draw individual agents
    if (showIndividualAgents) {
      for (const agent of agents) {
        const pos = latLngToCanvas(agent.currentPosition)

        // Choose color based on agent type
        let color = '#3b82f6' // Default blue
        let size = 3

        switch (agent.agentType) {
          case 'wheelchair':
            color = '#ef4444' // Red
            size = 5
            break
          case 'mobility_aid':
            color = '#f97316' // Orange
            size = 4
            break
          case 'elderly':
            color = '#8b5cf6' // Purple
            size = 3
            break
          case 'child':
            color = '#10b981' // Green
            size = 2
            break
          default:
            color = '#3b82f6' // Blue
            size = 3
        }

        // Draw agent
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()

        // Draw velocity vector if agent is moving
        const speed = Math.sqrt(
          agent.velocity.x * agent.velocity.x + agent.velocity.y * agent.velocity.y,
        )
        if (speed > 0.1) {
          const velocityScale = 20
          const endX = pos.x + agent.velocity.x * velocityScale
          const endY = pos.y + agent.velocity.y * velocityScale

          ctx.beginPath()
          ctx.moveTo(pos.x, pos.y)
          ctx.lineTo(endX, endY)
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
  }, [agents, densityGrid, showDensityHeatmap, showIndividualAgents, width, height, bounds, latLngToCanvas])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded"
      />
      
      {/* Legend */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded text-xs">
        <div className="font-semibold mb-1">Agent Types:</div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span>Normal</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>Wheelchair</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
          <span>Mobility Aid</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
          <span>Elderly</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Child</span>
        </div>
        
        {showDensityHeatmap && (
          <div className="mt-2">
            <div className="font-semibold mb-1">Density:</div>
            <div className="flex items-center">
              <div className="w-4 h-2 bg-gradient-to-r from-blue-500 to-red-500 mr-2"></div>
              <span>Low → High</span>
            </div>
          </div>
        )}
      </div>

      {/* Agent count */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded text-sm">
        Active Agents: {agents.length}
      </div>
    </div>
  )
}