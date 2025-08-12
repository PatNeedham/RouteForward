import { Point, SidewalkNode, SidewalkNetwork } from '@/types/simulation'

interface PathNode {
  id: string
  position: Point
  gCost: number // Cost from start
  hCost: number // Heuristic cost to goal
  fCost: number // Total cost (g + h)
  parent?: PathNode
}

export class PathfindingSystem {
  private network: SidewalkNetwork

  constructor(network: SidewalkNetwork) {
    this.network = network
  }

  // Calculate distance between two points using Haversine formula
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

  // Find the closest node to a given point
  private findClosestNode(
    point: Point,
    accessibilityRequired?: 'full' | 'limited',
  ): SidewalkNode | null {
    let closestNode: SidewalkNode | null = null
    let minDistance = Infinity

    for (const node of this.network.nodes) {
      // Filter by accessibility if required
      if (
        accessibilityRequired &&
        node.accessibility === 'none' &&
        accessibilityRequired === 'full'
      ) {
        continue
      }

      const distance = this.calculateDistance(point, node.position)
      if (distance < minDistance) {
        minDistance = distance
        closestNode = node
      }
    }

    return closestNode
  }

  // A* pathfinding algorithm
  public findPath(
    start: Point,
    goal: Point,
    accessibilityRequired?: 'full' | 'limited',
  ): Point[] {
    const startNode = this.findClosestNode(start, accessibilityRequired)
    const goalNode = this.findClosestNode(goal, accessibilityRequired)

    if (!startNode || !goalNode) {
      // Fallback to direct path if no network nodes available
      return [start, goal]
    }

    const openSet: PathNode[] = []
    const closedSet: Set<string> = new Set()
    const nodeMap: Map<string, PathNode> = new Map()

    // Initialize start node
    const startPathNode: PathNode = {
      id: startNode.id,
      position: startNode.position,
      gCost: 0,
      hCost: this.calculateDistance(startNode.position, goalNode.position),
      fCost: 0,
    }
    startPathNode.fCost = startPathNode.gCost + startPathNode.hCost

    openSet.push(startPathNode)
    nodeMap.set(startNode.id, startPathNode)

    while (openSet.length > 0) {
      // Find node with lowest fCost
      openSet.sort((a, b) => a.fCost - b.fCost)
      const currentNode = openSet.shift()!

      if (currentNode.id === goalNode.id) {
        // Reconstruct path
        const path: Point[] = []
        let current: PathNode | undefined = currentNode

        while (current) {
          path.push(current.position)
          current = current.parent
        }

        path.reverse()
        // Replace first and last with exact start/goal positions
        path[0] = start
        path[path.length - 1] = goal
        
        return path
      }

      closedSet.add(currentNode.id)

      // Examine neighbors
      const networkNode = this.network.nodes.find(
        (n) => n.id === currentNode.id,
      )
      if (!networkNode) continue

      for (const neighborId of networkNode.connections) {
        if (closedSet.has(neighborId)) continue

        const neighborNetworkNode = this.network.nodes.find(
          (n) => n.id === neighborId,
        )
        if (!neighborNetworkNode) continue

        // Check accessibility requirements
        if (
          accessibilityRequired &&
          neighborNetworkNode.accessibility === 'none' &&
          accessibilityRequired === 'full'
        ) {
          continue
        }

        const gCost =
          currentNode.gCost +
          this.calculateDistance(currentNode.position, neighborNetworkNode.position)
        const hCost = this.calculateDistance(
          neighborNetworkNode.position,
          goalNode.position,
        )

        let neighborPathNode = nodeMap.get(neighborId)
        if (!neighborPathNode) {
          neighborPathNode = {
            id: neighborId,
            position: neighborNetworkNode.position,
            gCost: Infinity,
            hCost,
            fCost: Infinity,
          }
          nodeMap.set(neighborId, neighborPathNode)
        }

        if (gCost < neighborPathNode.gCost) {
          neighborPathNode.gCost = gCost
          neighborPathNode.fCost = gCost + hCost
          neighborPathNode.parent = currentNode

          if (!openSet.includes(neighborPathNode)) {
            openSet.push(neighborPathNode)
          }
        }
      }
    }

    // No path found, return direct path
    return [start, goal]
  }

  // Check if a position has obstacles nearby
  public hasObstacleAt(position: Point, radius: number = 2): boolean {
    for (const obstacle of this.network.obstacles) {
      const distance = this.calculateDistance(position, obstacle.position)
      if (distance < obstacle.radius + radius) {
        return true
      }
    }
    return false
  }

  // Get obstacle avoidance vector
  public getObstacleAvoidanceForce(
    position: Point,
    velocity: { x: number; y: number },
    lookAheadDistance: number = 5,
  ): { x: number; y: number } {
    const avoidanceForce = { x: 0, y: 0 }

    // Look ahead along current velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
    if (speed === 0) return avoidanceForce

    const normalizedVel = { x: velocity.x / speed, y: velocity.y / speed }
    const lookAheadPos = {
      lat: position.lat + (normalizedVel.y * lookAheadDistance) / 111000, // Rough conversion
      lng: position.lng + (normalizedVel.x * lookAheadDistance) / 111000,
    }

    for (const obstacle of this.network.obstacles) {
      const distanceToObstacle = this.calculateDistance(position, obstacle.position)
      const distanceToLookAhead = this.calculateDistance(
        lookAheadPos,
        obstacle.position,
      )

      // If obstacle is in our path and close enough
      if (
        distanceToObstacle < obstacle.radius + 3 ||
        distanceToLookAhead < obstacle.radius + 2
      ) {
        // Calculate avoidance direction (perpendicular to velocity)
        const avoidDirection = { x: -normalizedVel.y, y: normalizedVel.x }

        // Choose left or right based on obstacle position
        const obstacleRelativePos = {
          x: obstacle.position.lng - position.lng,
          y: obstacle.position.lat - position.lat,
        }

        const cross =
          normalizedVel.x * obstacleRelativePos.y -
          normalizedVel.y * obstacleRelativePos.x

        if (cross < 0) {
          avoidDirection.x *= -1
          avoidDirection.y *= -1
        }

        // Force strength based on distance
        const force = Math.max(0, 1 - distanceToObstacle / (obstacle.radius + 3))
        avoidanceForce.x += avoidDirection.x * force * 10
        avoidanceForce.y += avoidDirection.y * force * 10
      }
    }

    return avoidanceForce
  }
}