import {
  Point,
  RouteSegment,
  TransitStop,
  PedestrianAgent,
  BusAgent,
  TravelTimeResult,
  SimulationConfig,
  SimulationResult,
  ComparisonResult,
} from '@/types/simulation'

// Secure random number generator utility
function getSecureRandomFloat(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] / (0xffffffff + 1)
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    const crypto = require('crypto')
    return crypto.randomBytes(4).readUInt32BE(0) / (0xffffffff + 1)
  }
  // Fallback (should not be used in production)
  console.warn(
    'Secure random number generation not available, falling back to Math.random()',
  )
  return Math.random()
}

export class SimulationEngine {
  private config: SimulationConfig
  private routes: RouteSegment[]
  private stops: TransitStop[]
  private pedestrians: PedestrianAgent[]
  private buses: BusAgent[]

  constructor(
    routes: RouteSegment[],
    stops: TransitStop[],
    config?: Partial<SimulationConfig>,
  ) {
    this.routes = routes
    this.stops = stops
    this.pedestrians = []
    this.buses = []

    this.config = {
      duration: 60, // 1 hour simulation
      timeStep: 0.5, // 30 second steps
      rushHourPeriods: [
        { start: 420, end: 540, speedMultiplier: 0.7 }, // 7-9 AM
        { start: 1020, end: 1140, speedMultiplier: 0.7 }, // 5-7 PM
      ],
      walkingSpeed: {
        normal: 80, // meters per minute
        rushHour: 70,
      },
      busSpeed: {
        normal: 400, // meters per minute
        rushHour: 300,
      },
      ...config,
    }
  }

  // Calculate straight-line distance between two points using Haversine formula
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

  // Get current speed multiplier based on time of day
  private getSpeedMultiplier(currentTime: number): number {
    const timeInMinutes = currentTime % 1440 // Convert to minutes from midnight

    for (const period of this.config.rushHourPeriods) {
      if (timeInMinutes >= period.start && timeInMinutes <= period.end) {
        return period.speedMultiplier
      }
    }
    return 1.0
  }

  // Find the nearest transit stop to a point
  private findNearestStop(
    point: Point,
    type?: 'bus' | 'rail',
  ): TransitStop | null {
    let nearestStop: TransitStop | null = null
    let minDistance = Infinity

    for (const stop of this.stops) {
      if (type && stop.type !== type) continue

      const distance = this.calculateDistance(point, stop.location)
      if (distance < minDistance) {
        minDistance = distance
        nearestStop = stop
      }
    }

    return nearestStop
  }

  // Calculate walking time between two points
  private calculateWalkingTime(
    origin: Point,
    destination: Point,
    currentTime: number,
  ): number {
    const distance = this.calculateDistance(origin, destination)
    const speedMultiplier = this.getSpeedMultiplier(currentTime)
    const baseSpeed = this.config.walkingSpeed.normal
    const adjustedSpeed =
      speedMultiplier < 1 ? this.config.walkingSpeed.rushHour : baseSpeed

    return distance / adjustedSpeed
  }

  // Calculate bus travel time along a route
  private calculateBusTime(
    route: RouteSegment,
    originStop: TransitStop,
    destinationStop: TransitStop,
    currentTime: number,
  ): number {
    // Simplified: assume uniform distribution of stops along route
    const totalDistance = this.calculateRouteDistance(route)
    const speedMultiplier = this.getSpeedMultiplier(currentTime)
    const baseSpeed = this.config.busSpeed.normal
    const adjustedSpeed =
      speedMultiplier < 1 ? this.config.busSpeed.rushHour : baseSpeed

    // Add waiting time (average half the headway, assume 10 minutes)
    const waitTime = 5 + (speedMultiplier < 1 ? 3 : 0) // More waiting during rush hour
    const travelTime = totalDistance / adjustedSpeed

    return waitTime + travelTime
  }

  // Calculate total distance of a route
  private calculateRouteDistance(route: RouteSegment): number {
    let totalDistance = 0
    const coords = route.coordinates

    for (let i = 0; i < coords.length - 1; i++) {
      totalDistance += this.calculateDistance(coords[i], coords[i + 1])
    }

    return totalDistance
  }

  // Helper method to create a walking route result
  private createWalkingRoute(
    origin: Point,
    destination: Point,
    duration: number,
    confidence: number,
  ): TravelTimeResult {
    return {
      origin,
      destination,
      duration,
      confidence,
      route: [
        {
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking',
        },
      ],
      mode: 'walking',
    }
  }

  // Helper method to find a direct transit route between stops
  private findDirectTransitRoute(
    originStop: TransitStop,
    destinationStop: TransitStop,
  ): RouteSegment | null {
    const commonRoutes = originStop.routes.filter((route) =>
      destinationStop.routes.includes(route),
    )
    if (commonRoutes.length === 0) return null

    const routeId = commonRoutes[0]
    return this.routes.find((r) => r.name === routeId) || null
  }

  // Helper method to calculate transit route details
  private calculateTransitRoute(
    origin: Point,
    destination: Point,
    route: RouteSegment,
    originStop: TransitStop,
    destinationStop: TransitStop,
    currentTime: number,
  ): { duration: number; route: RouteSegment[] } {
    const walkToStop = this.calculateWalkingTime(
      origin,
      originStop.location,
      currentTime,
    )
    const busTime = this.calculateBusTime(
      route,
      originStop,
      destinationStop,
      currentTime,
    )
    const walkFromStop = this.calculateWalkingTime(
      destinationStop.location,
      destination,
      currentTime,
    )

    return {
      duration: walkToStop + busTime + walkFromStop,
      route: [
        {
          id: 'walk-to-stop',
          name: 'Walk to stop',
          coordinates: [origin, originStop.location],
          type: 'walking',
        },
        route,
        {
          id: 'walk-from-stop',
          name: 'Walk from stop',
          coordinates: [destinationStop.location, destination],
          type: 'walking',
        },
      ],
    }
  }

  // Find optimal route between two points
  private findOptimalRoute(
    origin: Point,
    destination: Point,
    currentTime: number,
  ): TravelTimeResult {
    const walkingTime = this.calculateWalkingTime(
      origin,
      destination,
      currentTime,
    )

    // Check if walking is reasonable (< 2km)
    const walkingDistance = this.calculateDistance(origin, destination)
    if (walkingDistance < 2000) {
      return this.createWalkingRoute(origin, destination, walkingTime, 0.9)
    }

    // Find best transit option
    const originStop = this.findNearestStop(origin, 'bus')
    const destinationStop = this.findNearestStop(destination, 'bus')

    if (!originStop || !destinationStop) {
      // No transit available, must walk
      return this.createWalkingRoute(origin, destination, walkingTime, 0.8)
    }

    // Find direct transit route between stops
    const transitRoute = this.findDirectTransitRoute(
      originStop,
      destinationStop,
    )

    if (!transitRoute) {
      // No direct route, use walking
      return this.createWalkingRoute(origin, destination, walkingTime, 0.7)
    }

    // Calculate transit route details
    const transitDetails = this.calculateTransitRoute(
      origin,
      destination,
      transitRoute,
      originStop,
      destinationStop,
      currentTime,
    )

    // Choose best option between walking and transit
    if (transitDetails.duration < walkingTime) {
      return {
        origin,
        destination,
        duration: transitDetails.duration,
        confidence: 0.8,
        route: transitDetails.route,
        mode: 'mixed',
      }
    } else {
      return this.createWalkingRoute(origin, destination, walkingTime, 0.8)
    }
  }

  // Run simulation for multiple origin-destination pairs
  public async simulate(
    originDestinationPairs: Array<{ origin: Point; destination: Point }>,
    timeOfDay: number = 480, // 8 AM default
  ): Promise<SimulationResult> {
    const startTime = Date.now()
    const travelTimes: TravelTimeResult[] = []

    for (const pair of originDestinationPairs) {
      const result = this.findOptimalRoute(
        pair.origin,
        pair.destination,
        timeOfDay,
      )
      travelTimes.push(result)
    }

    const totalSimulationTime = (Date.now() - startTime) / 1000
    const averageWaitTime =
      travelTimes
        .filter((t) => t.mode !== 'walking')
        .reduce((sum, _t) => sum + 5, 0) /
      Math.max(1, travelTimes.filter((t) => t.mode !== 'walking').length)

    const confidence =
      travelTimes.reduce((sum, t) => sum + t.confidence, 0) / travelTimes.length

    return {
      travelTimes,
      averageWaitTime,
      totalSimulationTime,
      confidence,
      scenario: 'current',
    }
  }

  // Compare current vs proposed scenarios
  public async compareScenarios(
    originDestinationPairs: Array<{ origin: Point; destination: Point }>,
    proposedRoutes: RouteSegment[],
    proposedStops: TransitStop[],
    timeOfDay: number = 480,
  ): Promise<ComparisonResult> {
    const { currentResult, proposedResult } = await this.runScenarios(
      originDestinationPairs,
      proposedRoutes,
      proposedStops,
      timeOfDay,
    )

    const improvements = this.calculateImprovements(
      currentResult,
      proposedResult,
    )

    return {
      current: currentResult,
      proposed: proposedResult,
      improvements,
    }
  }

  private async runScenarios(
    originDestinationPairs: Array<{ origin: Point; destination: Point }>,
    proposedRoutes: RouteSegment[],
    proposedStops: TransitStop[],
    timeOfDay: number,
  ) {
    // Run current scenario
    const currentResult = await this.simulate(originDestinationPairs, timeOfDay)

    // Create new engine with proposed changes
    const proposedEngine = new SimulationEngine(
      proposedRoutes,
      proposedStops,
      this.config,
    )
    const proposedResult = await proposedEngine.simulate(
      originDestinationPairs,
      timeOfDay,
    )
    proposedResult.scenario = 'proposed'

    return { currentResult, proposedResult }
  }

  private calculateImprovements(
    currentResult: SimulationResult,
    proposedResult: SimulationResult,
  ) {
    const currentAverage = this.calculateAverageTravelTime(
      currentResult.travelTimes,
    )
    const proposedAverage = this.calculateAverageTravelTime(
      proposedResult.travelTimes,
    )

    const averageTimeSaved = currentAverage - proposedAverage
    const percentImprovement = (averageTimeSaved / currentAverage) * 100

    const affectedRoutes = this.extractAffectedRoutes(
      currentResult,
      proposedResult,
    )

    return {
      averageTimeSaved,
      percentImprovement,
      affectedRoutes,
    }
  }

  private calculateAverageTravelTime(travelTimes: TravelTimeResult[]): number {
    return (
      travelTimes.reduce((sum, t) => sum + t.duration, 0) / travelTimes.length
    )
  }

  private extractAffectedRoutes(
    currentResult: SimulationResult,
    proposedResult: SimulationResult,
  ): string[] {
    return [
      ...new Set([
        ...currentResult.travelTimes.flatMap((t) => t.route.map((r) => r.name)),
        ...proposedResult.travelTimes.flatMap((t) =>
          t.route.map((r) => r.name),
        ),
      ]),
    ].filter((name) => name !== 'Walking')
  }

  // Generate sample origin-destination pairs for testing
  public generateSampleTrips(
    count: number = 20,
  ): Array<{ origin: Point; destination: Point }> {
    const trips: Array<{ origin: Point; destination: Point }> = []

    // Jersey City bounds (approximate)
    const bounds = {
      north: 40.75,
      south: 40.7,
      east: -74.03,
      west: -74.08,
    }

    for (let i = 0; i < count; i++) {
      const origin: Point = {
        lat:
          bounds.south + getSecureRandomFloat() * (bounds.north - bounds.south),
        lng: bounds.west + getSecureRandomFloat() * (bounds.east - bounds.west),
      }

      const destination: Point = {
        lat:
          bounds.south + getSecureRandomFloat() * (bounds.north - bounds.south),
        lng: bounds.west + getSecureRandomFloat() * (bounds.east - bounds.west),
      }

      trips.push({ origin, destination })
    }

    return trips
  }
}
