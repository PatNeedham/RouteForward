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
  TimeWindow
} from '@/types/simulation'

export class SimulationEngine {
  private config: SimulationConfig
  private routes: RouteSegment[]
  private stops: TransitStop[]
  private pedestrians: PedestrianAgent[]
  private buses: BusAgent[]

  constructor(
    routes: RouteSegment[],
    stops: TransitStop[],
    config?: Partial<SimulationConfig>
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
        { start: 1020, end: 1140, speedMultiplier: 0.7 } // 5-7 PM
      ],
      walkingSpeed: {
        normal: 80, // meters per minute
        rushHour: 70
      },
      busSpeed: {
        normal: 400, // meters per minute
        rushHour: 300
      },
      ...config
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
  private findNearestStop(point: Point, type?: 'bus' | 'rail'): TransitStop | null {
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
    currentTime: number
  ): number {
    const distance = this.calculateDistance(origin, destination)
    const speedMultiplier = this.getSpeedMultiplier(currentTime)
    const baseSpeed = this.config.walkingSpeed.normal
    const adjustedSpeed = speedMultiplier < 1 
      ? this.config.walkingSpeed.rushHour 
      : baseSpeed
    
    return distance / adjustedSpeed
  }

  // Calculate bus travel time along a route
  private calculateBusTime(
    route: RouteSegment,
    originStop: TransitStop,
    destinationStop: TransitStop,
    currentTime: number
  ): number {
    // Simplified: assume uniform distribution of stops along route
    const totalDistance = this.calculateRouteDistance(route)
    const speedMultiplier = this.getSpeedMultiplier(currentTime)
    const baseSpeed = this.config.busSpeed.normal
    const adjustedSpeed = speedMultiplier < 1 
      ? this.config.busSpeed.rushHour 
      : baseSpeed

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

  // Find optimal route between two points
  private findOptimalRoute(
    origin: Point,
    destination: Point,
    currentTime: number
  ): TravelTimeResult {
    const walkingTime = this.calculateWalkingTime(origin, destination, currentTime)
    
    // Check if walking is reasonable (< 2km)
    const walkingDistance = this.calculateDistance(origin, destination)
    if (walkingDistance < 2000) {
      return {
        origin,
        destination,
        duration: walkingTime,
        confidence: 0.9,
        route: [{
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking'
        }],
        mode: 'walking'
      }
    }

    // Find best transit option
    const originStop = this.findNearestStop(origin, 'bus')
    const destinationStop = this.findNearestStop(destination, 'bus')

    if (!originStop || !destinationStop) {
      // No transit available, must walk
      return {
        origin,
        destination,
        duration: walkingTime,
        confidence: 0.8,
        route: [{
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking'
        }],
        mode: 'walking'
      }
    }

    // Find routes connecting these stops
    const commonRoutes = originStop.routes.filter(route => 
      destinationStop.routes.includes(route)
    )

    if (commonRoutes.length === 0) {
      // No direct route, use walking
      return {
        origin,
        destination,
        duration: walkingTime,
        confidence: 0.7,
        route: [{
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking'
        }],
        mode: 'walking'
      }
    }

    // Use the first available route (could be optimized)
    const routeId = commonRoutes[0]
    const route = this.routes.find(r => r.name === routeId)
    
    if (!route) {
      return {
        origin,
        destination,
        duration: walkingTime,
        confidence: 0.6,
        route: [{
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking'
        }],
        mode: 'walking'
      }
    }

    const walkToStop = this.calculateWalkingTime(origin, originStop.location, currentTime)
    const busTime = this.calculateBusTime(route, originStop, destinationStop, currentTime)
    const walkFromStop = this.calculateWalkingTime(destinationStop.location, destination, currentTime)
    
    const totalTransitTime = walkToStop + busTime + walkFromStop

    // Choose best option
    if (totalTransitTime < walkingTime) {
      return {
        origin,
        destination,
        duration: totalTransitTime,
        confidence: 0.8,
        route: [
          {
            id: 'walk-to-stop',
            name: 'Walk to stop',
            coordinates: [origin, originStop.location],
            type: 'walking'
          },
          route,
          {
            id: 'walk-from-stop',
            name: 'Walk from stop',
            coordinates: [destinationStop.location, destination],
            type: 'walking'
          }
        ],
        mode: 'mixed'
      }
    } else {
      return {
        origin,
        destination,
        duration: walkingTime,
        confidence: 0.8,
        route: [{
          id: 'walking',
          name: 'Walking',
          coordinates: [origin, destination],
          type: 'walking'
        }],
        mode: 'walking'
      }
    }
  }

  // Run simulation for multiple origin-destination pairs
  public async simulate(
    originDestinationPairs: Array<{origin: Point, destination: Point}>,
    timeOfDay: number = 480 // 8 AM default
  ): Promise<SimulationResult> {
    const startTime = Date.now()
    const travelTimes: TravelTimeResult[] = []
    
    for (const pair of originDestinationPairs) {
      const result = this.findOptimalRoute(pair.origin, pair.destination, timeOfDay)
      travelTimes.push(result)
    }

    const totalSimulationTime = (Date.now() - startTime) / 1000
    const averageWaitTime = travelTimes
      .filter(t => t.mode !== 'walking')
      .reduce((sum, t) => sum + 5, 0) / Math.max(1, travelTimes.filter(t => t.mode !== 'walking').length)

    const confidence = travelTimes.reduce((sum, t) => sum + t.confidence, 0) / travelTimes.length

    return {
      travelTimes,
      averageWaitTime,
      totalSimulationTime,
      confidence,
      scenario: 'current'
    }
  }

  // Compare current vs proposed scenarios
  public async compareScenarios(
    originDestinationPairs: Array<{origin: Point, destination: Point}>,
    proposedRoutes: RouteSegment[],
    proposedStops: TransitStop[],
    timeOfDay: number = 480
  ): Promise<ComparisonResult> {
    // Run current scenario
    const currentResult = await this.simulate(originDestinationPairs, timeOfDay)

    // Create new engine with proposed changes
    const proposedEngine = new SimulationEngine(proposedRoutes, proposedStops, this.config)
    const proposedResult = await proposedEngine.simulate(originDestinationPairs, timeOfDay)
    proposedResult.scenario = 'proposed'

    // Calculate improvements
    const currentAverage = currentResult.travelTimes.reduce((sum, t) => sum + t.duration, 0) / currentResult.travelTimes.length
    const proposedAverage = proposedResult.travelTimes.reduce((sum, t) => sum + t.duration, 0) / proposedResult.travelTimes.length
    
    const averageTimeSaved = currentAverage - proposedAverage
    const percentImprovement = (averageTimeSaved / currentAverage) * 100

    const affectedRoutes = [...new Set([
      ...currentResult.travelTimes.flatMap(t => t.route.map(r => r.name)),
      ...proposedResult.travelTimes.flatMap(t => t.route.map(r => r.name))
    ])].filter(name => name !== 'Walking')

    return {
      current: currentResult,
      proposed: proposedResult,
      improvements: {
        averageTimeSaved,
        percentImprovement,
        affectedRoutes
      }
    }
  }

  // Generate sample origin-destination pairs for testing
  public generateSampleTrips(count: number = 20): Array<{origin: Point, destination: Point}> {
    const trips: Array<{origin: Point, destination: Point}> = []
    
    // Jersey City bounds (approximate)
    const bounds = {
      north: 40.75,
      south: 40.70,
      east: -74.03,
      west: -74.08
    }

    for (let i = 0; i < count; i++) {
      const origin: Point = {
        lat: bounds.south + Math.random() * (bounds.north - bounds.south),
        lng: bounds.west + Math.random() * (bounds.east - bounds.west)
      }
      
      const destination: Point = {
        lat: bounds.south + Math.random() * (bounds.north - bounds.south),
        lng: bounds.west + Math.random() * (bounds.east - bounds.west)
      }

      trips.push({ origin, destination })
    }

    return trips
  }
}