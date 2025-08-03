'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

// Secure random number generator utility for visualization effects
// Note: This is used for visual animation only, not security-sensitive operations
function getSecureRandomFloat(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] / (0xffffffff + 1)
  }
  // This fallback is acceptable for visualization purposes only
  // NOSONAR - Math.random() is safe for non-security-sensitive visualization
  return Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
}

interface TrafficVisualizationProps {
  width?: number
  height?: number
}

interface Node {
  id: number
  x: number
  y: number
}

interface Link {
  source: number
  target: number
  fast: boolean
}

interface Particle {
  link: Link
  position: number
}

const TrafficVisualization: React.FC<TrafficVisualizationProps> = ({
  width = 800,
  height = 600,
}) => {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove() // Clear previous render

    const gridSize = 20
    const numCols = Math.floor(width / gridSize)
    const numRows = Math.floor(height / gridSize)

    const nodes: Node[] = d3.range(numCols * numRows).map((i) => ({
      x: (i % numCols) * gridSize + gridSize / 2,
      y: Math.floor(i / numCols) * gridSize + gridSize / 2,
      id: i,
    }))

    const links: Link[] = []
    for (let y = 0; y < numRows; y++) {
      for (let x = 0; x < numCols; x++) {
        if (x < numCols - 1) {
          links.push({
            source: y * numCols + x,
            target: y * numCols + x + 1,
            fast: getSecureRandomFloat() > 0.9,
          })
        }
        if (y < numRows - 1) {
          links.push({
            source: y * numCols + x,
            target: (y + 1) * numCols + x,
            fast: getSecureRandomFloat() > 0.9,
          })
        }
      }
    }

    const pathGroup = svg.append('g')

    pathGroup
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', (d) => {
        const sourceNode = nodes[d.source]
        const targetNode = nodes[d.target]
        return `M${sourceNode.x},${sourceNode.y}L${targetNode.x},${targetNode.y}`
      })
      .attr('stroke', (d) => (d.fast ? '#0ea5e9' : '#374151')) // sky-500 for fast, gray-700 for normal
      .attr('stroke-width', 1)

    const particles: Particle[] = d3.range(200).map(() => {
      const link = links[Math.floor(getSecureRandomFloat() * links.length)]
      return {
        link,
        position: getSecureRandomFloat(),
      }
    })

    const particleGroup = svg.append('g')

    const particleShapes = particleGroup
      .selectAll('circle')
      .data(particles)
      .enter()
      .append('circle')
      .attr('r', 2)
      .attr('fill', (d) => (d.link.fast ? '#0ea5e9' : '#9ca3af')) // sky-500 for fast, gray-400 for normal

    const animate = () => {
      particleShapes.each(function (d) {
        d.position += d.link.fast ? 0.01 : 0.003
        if (d.position > 1) {
          d.position = 0
          d.link = links[Math.floor(getSecureRandomFloat() * links.length)]
        }

        const sourceNode = nodes[d.link.source]
        const targetNode = nodes[d.link.target]
        const x = d3.interpolate(sourceNode.x, targetNode.x)(d.position)
        const y = d3.interpolate(sourceNode.y, targetNode.y)(d.position)
        d3.select(this).attr('cx', x).attr('cy', y)
      })

      frameId.current = requestAnimationFrame(animate)
    }

    const frameId = { current: 0 }
    frameId.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId.current)
  }, [width, height])

  return <svg ref={ref} width={width} height={height} />
}

export default TrafficVisualization
