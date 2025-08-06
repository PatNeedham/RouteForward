import { PedestrianAgent, Point, CrowdMetrics, PedestrianSimConfig } from '@/types/simulation'

export class CrowdDynamicsSystem {
  private config: PedestrianSimConfig['crowdDynamics']

  constructor(config: PedestrianSimConfig['crowdDynamics']) {
    this.config = config
  }

  // Calculate distance between two points
  private calculateDistance(point1: Point, point2: Point): number {
    const R = 6371000 // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180
    const φ2 = (point2.lat * Math.PI) / 180
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Convert lat/lng to local coordinates for vector math
  private toLocalCoords(point: Point, origin: Point): { x: number; y: number } {
    return {
      x: (point.lng - origin.lng) * 111320 * Math.cos((origin.lat * Math.PI) / 180),
      y: (point.lat - origin.lat) * 110540,
    }
  }

  // Convert local coordinates back to lat/lng
  private fromLocalCoords(
    coords: { x: number; y: number },
    origin: Point,
  ): Point {
    return {
      lat: origin.lat + coords.y / 110540,
      lng:
        origin.lng +
        coords.x / (111320 * Math.cos((origin.lat * Math.PI) / 180)),
    }
  }

  // Normalize vector
  private normalize(vector: { x: number; y: number }): { x: number; y: number } {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length === 0) return { x: 0, y: 0 }
    return { x: vector.x / length, y: vector.y / length }
  }

  // Limit vector magnitude
  private limit(
    vector: { x: number; y: number },
    maxMagnitude: number,
  ): { x: number; y: number } {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length > maxMagnitude) {
      return {
        x: (vector.x / length) * maxMagnitude,
        y: (vector.y / length) * maxMagnitude,
      }
    }
    return vector
  }

  // Separation: steer to avoid crowding local flockmates
  private separation(
    agent: PedestrianAgent,
    neighbors: PedestrianAgent[],
  ): { x: number; y: number } {
    const steer = { x: 0, y: 0 }
    let count = 0

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(
        agent.currentPosition,
        neighbor.currentPosition,
      )

      if (distance > 0 && distance < this.config.separationRadius) {
        // Calculate vector pointing away from neighbor
        const agentLocal = this.toLocalCoords(
          agent.currentPosition,
          agent.currentPosition,
        )
        const neighborLocal = this.toLocalCoords(
          neighbor.currentPosition,
          agent.currentPosition,
        )

        const diff = {
          x: agentLocal.x - neighborLocal.x,
          y: agentLocal.y - neighborLocal.y,
        }

        const normalized = this.normalize(diff)
        // Weight by distance (closer = stronger repulsion)
        const weight = 1 / distance

        steer.x += normalized.x * weight
        steer.y += normalized.y * weight
        count++
      }
    }

    if (count > 0) {
      steer.x /= count
      steer.y /= count

      // Steer towards the separation direction
      const normalized = this.normalize(steer)
      return {
        x: normalized.x * agent.maxSpeed - agent.velocity.x,
        y: normalized.y * agent.maxSpeed - agent.velocity.y,
      }
    }

    return { x: 0, y: 0 }
  }

  // Alignment: steer towards the average heading of neighbors
  private alignment(
    agent: PedestrianAgent,
    neighbors: PedestrianAgent[],
  ): { x: number; y: number } {
    const sum = { x: 0, y: 0 }
    let count = 0

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(
        agent.currentPosition,
        neighbor.currentPosition,
      )

      if (distance > 0 && distance < this.config.alignmentRadius) {
        sum.x += neighbor.velocity.x
        sum.y += neighbor.velocity.y
        count++
      }
    }

    if (count > 0) {
      sum.x /= count
      sum.y /= count

      const normalized = this.normalize(sum)
      return {
        x: normalized.x * agent.maxSpeed - agent.velocity.x,
        y: normalized.y * agent.maxSpeed - agent.velocity.y,
      }
    }

    return { x: 0, y: 0 }
  }

  // Cohesion: steer to move toward the average position of neighbors
  private cohesion(
    agent: PedestrianAgent,
    neighbors: PedestrianAgent[],
  ): { x: number; y: number } {
    const sum = { x: 0, y: 0 }
    let count = 0

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(
        agent.currentPosition,
        neighbor.currentPosition,
      )

      if (distance > 0 && distance < this.config.cohesionRadius) {
        const neighborLocal = this.toLocalCoords(
          neighbor.currentPosition,
          agent.currentPosition,
        )
        sum.x += neighborLocal.x
        sum.y += neighborLocal.y
        count++
      }
    }

    if (count > 0) {
      sum.x /= count
      sum.y /= count

      // Seek towards center of mass
      return this.seek(agent, sum)
    }

    return { x: 0, y: 0 }
  }

  // Seek: steer towards a target
  private seek(
    agent: PedestrianAgent,
    target: { x: number; y: number },
  ): { x: number; y: number } {
    const desired = this.normalize(target)
    return {
      x: desired.x * agent.maxSpeed - agent.velocity.x,
      y: desired.y * agent.maxSpeed - agent.velocity.y,
    }
  }

  // Calculate flocking forces for an agent
  public calculateFlockingForces(
    agent: PedestrianAgent,
    allAgents: PedestrianAgent[],
  ): { x: number; y: number } {
    // Find neighbors within perception range
    const neighbors = allAgents.filter((other) => {
      if (other.id === agent.id) return false
      const distance = this.calculateDistance(
        agent.currentPosition,
        other.currentPosition,
      )
      return distance < Math.max(
        this.config.separationRadius,
        this.config.alignmentRadius,
        this.config.cohesionRadius,
      )
    })

    // Calculate individual forces
    const sep = this.separation(agent, neighbors)
    const align = this.alignment(agent, neighbors)
    const coh = this.cohesion(agent, neighbors)

    // Weight the forces
    sep.x *= 2.0 // Separation is most important for crowd safety
    sep.y *= 2.0
    align.x *= 1.0
    align.y *= 1.0
    coh.x *= 1.0
    coh.y *= 1.0

    // Combine forces
    const totalForce = {
      x: sep.x + align.x + coh.x,
      y: sep.y + align.y + coh.y,
    }

    return this.limit(totalForce, this.config.maxForce)
  }

  // Calculate goal-seeking force
  public calculateGoalForce(agent: PedestrianAgent): { x: number; y: number } {
    if (!agent.route || agent.route.length === 0 || agent.isAtDestination) {
      return { x: 0, y: 0 }
    }

    // Get next waypoint
    const nextWaypoint = agent.route[agent.pathIndex]
    if (!nextWaypoint) return { x: 0, y: 0 }

    const target = this.toLocalCoords(nextWaypoint, agent.currentPosition)
    const distance = Math.sqrt(target.x * target.x + target.y * target.y)

    // If close to waypoint, advance to next
    if (distance < 2) {
      // 2 meters threshold
      agent.pathIndex = Math.min(agent.pathIndex + 1, agent.route.length - 1)
      if (agent.pathIndex >= agent.route.length - 1) {
        agent.isAtDestination = true
        return { x: 0, y: 0 }
      }
    }

    // Seek towards current target
    const desired = this.normalize(target)
    return {
      x: desired.x * agent.maxSpeed - agent.velocity.x,
      y: desired.y * agent.maxSpeed - agent.velocity.y,
    }
  }

  // Calculate crowd metrics for a given area
  public calculateCrowdMetrics(
    agents: PedestrianAgent[],
    center: Point,
    radius: number,
  ): CrowdMetrics {
    const agentsInArea = agents.filter((agent) => {
      const distance = this.calculateDistance(agent.currentPosition, center)
      return distance <= radius
    })

    const areaSize = Math.PI * radius * radius
    const density = agentsInArea.length / areaSize

    const averageSpeed =
      agentsInArea.length > 0
        ? agentsInArea.reduce((sum, agent) => {
            const speed = Math.sqrt(
              agent.velocity.x * agent.velocity.x +
                agent.velocity.y * agent.velocity.y,
            )
            return sum + speed
          }, 0) / agentsInArea.length
        : 0

    // Simple flow rate estimation
    const flowRate = density * averageSpeed * 60 // people per minute

    // Congestion level based on density and speed
    const maxDensity = 5 // people per m²
    const densityFactor = Math.min(density / maxDensity, 1)
    const speedFactor = 1 - averageSpeed / 80 // Assuming max walking speed ~80 m/min
    const congestionLevel = Math.max(densityFactor, speedFactor)

    return {
      density,
      averageSpeed,
      flowRate,
      congestionLevel: Math.min(congestionLevel, 1),
    }
  }
}