import {
  PedestrianAgent,
  Point,
  TransitStop,
  WeatherConditions,
  PedestrianSimConfig,
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
  // This fallback is acceptable for simulation data generation only
  // NOSONAR - Math.random() is safe for non-security-sensitive simulation data
  return Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
}

export class PedestrianAgentFactory {
  private config: PedestrianSimConfig
  private agentCounter: number = 0

  constructor(config: PedestrianSimConfig) {
    this.config = config
  }

  // Create a pedestrian agent with realistic properties
  public createAgent(
    origin: Point,
    destination: Point,
    targetStop?: TransitStop,
    agentType?: PedestrianAgent['agentType'],
  ): PedestrianAgent {
    const id = `pedestrian_${++this.agentCounter}`
    const selectedAgentType = agentType || this.selectRandomAgentType()

    // Base walking speed in meters per minute (3-5 mph = 80-134 m/min)
    const baseSpeed = 80 + getSecureRandomFloat() * 54 // 80-134 m/min

    // Apply agent type speed modifiers
    const speedModifier = this.getSpeedModifier(selectedAgentType)
    const maxSpeed = baseSpeed * speedModifier

    // Apply weather effects
    const weatherModifier = this.getWeatherSpeedModifier(
      this.config.weather,
      this.getWeatherSensitivity(selectedAgentType),
    )
    const currentSpeed = maxSpeed * weatherModifier

    // Crowd avoidance radius based on agent type
    const crowdAvoidanceRadius = this.getCrowdAvoidanceRadius(selectedAgentType)

    return {
      id,
      origin,
      destination,
      walkingSpeed: currentSpeed,
      currentPosition: { ...origin },
      velocity: { x: 0, y: 0 },
      agentType: selectedAgentType,
      maxSpeed: currentSpeed,
      targetStop,
      pathIndex: 0,
      weatherSensitivity: this.getWeatherSensitivity(selectedAgentType),
      crowdAvoidanceRadius,
      isAtDestination: false,
      lastUpdate: Date.now(),
    }
  }

  // Select random agent type based on realistic population distribution
  private selectRandomAgentType(): PedestrianAgent['agentType'] {
    const rand = getSecureRandomFloat()

    // Realistic distribution based on urban demographics
    if (rand < 0.75) return 'normal' // 75% normal pedestrians
    if (rand < 0.85) return 'elderly' // 10% elderly
    if (rand < 0.92) return 'child' // 7% children
    if (rand < 0.97) return 'wheelchair' // 5% wheelchair users
    return 'mobility_aid' // 3% mobility aid users
  }

  // Get speed modifier based on agent type
  private getSpeedModifier(agentType: PedestrianAgent['agentType']): number {
    switch (agentType) {
      case 'normal':
        return 1.0
      case 'elderly':
        return this.config.accessibility.elderlySpeedFactor
      case 'child':
        return this.config.accessibility.childSpeedFactor
      case 'wheelchair':
        return this.config.accessibility.wheelchairSpeedFactor
      case 'mobility_aid':
        return this.config.accessibility.mobilityAidSpeedFactor
      default:
        return 1.0
    }
  }

  // Get weather sensitivity based on agent type
  private getWeatherSensitivity(agentType: PedestrianAgent['agentType']): number {
    switch (agentType) {
      case 'normal':
        return 0.3 + getSecureRandomFloat() * 0.4 // 0.3-0.7
      case 'elderly':
        return 0.6 + getSecureRandomFloat() * 0.3 // 0.6-0.9 (more sensitive)
      case 'child':
        return 0.5 + getSecureRandomFloat() * 0.4 // 0.5-0.9
      case 'wheelchair':
        return 0.7 + getSecureRandomFloat() * 0.2 // 0.7-0.9 (very sensitive)
      case 'mobility_aid':
        return 0.6 + getSecureRandomFloat() * 0.3 // 0.6-0.9
      default:
        return 0.5
    }
  }

  // Get crowd avoidance radius based on agent type
  private getCrowdAvoidanceRadius(agentType: PedestrianAgent['agentType']): number {
    switch (agentType) {
      case 'normal':
        return 1.5 // 1.5 meters
      case 'elderly':
        return 2.0 // Need more space
      case 'child':
        return 1.0 // Smaller radius
      case 'wheelchair':
        return 2.5 // Need much more space
      case 'mobility_aid':
        return 2.2 // Need extra space
      default:
        return 1.5
    }
  }

  // Calculate weather speed modifier
  private getWeatherSpeedModifier(
    weather: WeatherConditions,
    sensitivity: number,
  ): number {
    let modifier = 1.0

    // Temperature effects
    if (weather.temperature < 0) {
      modifier *= 1 - sensitivity * 0.3 // Cold slows down
    } else if (weather.temperature > 30) {
      modifier *= 1 - sensitivity * 0.2 // Heat slows down
    }

    // Precipitation effects
    if (weather.precipitation > 0) {
      modifier *= 1 - sensitivity * weather.precipitation * 0.4
    }

    // Wind effects
    if (weather.windSpeed > 10) {
      modifier *= 1 - sensitivity * 0.2
    }

    // Visibility effects
    if (weather.visibility < 0.8) {
      modifier *= 1 - sensitivity * (1 - weather.visibility) * 0.3
    }

    return Math.max(modifier, 0.3) // Never go below 30% speed
  }

  // Create a batch of agents for simulation
  public createAgentBatch(
    originDestinationPairs: Array<{
      origin: Point
      destination: Point
      targetStop?: TransitStop
    }>,
    rushHour: boolean = false,
  ): PedestrianAgent[] {
    const agents: PedestrianAgent[] = []

    for (const pair of originDestinationPairs) {
      const agent = this.createAgent(
        pair.origin,
        pair.destination,
        pair.targetStop,
      )

      // During rush hour, apply speed reduction due to crowding
      if (rushHour) {
        agent.walkingSpeed *= 0.8 // 20% slower during rush hour
        agent.maxSpeed = agent.walkingSpeed // Update maxSpeed to match
      }

      agents.push(agent)
    }

    return agents
  }

  // Generate realistic origin-destination pairs for a transit stop
  public generateStopCentricTrips(
    transitStop: TransitStop,
    count: number,
    radius: number = 1000, // meters
  ): Array<{ origin: Point; destination: Point; targetStop: TransitStop }> {
    const trips: Array<{
      origin: Point
      destination: Point
      targetStop: TransitStop
    }> = []

    for (let i = 0; i < count; i++) {
      // Generate random point within radius of the stop
      const angle = getSecureRandomFloat() * 2 * Math.PI
      const distance = getSecureRandomFloat() * radius

      // Convert to lat/lng offset
      const latOffset = (distance * Math.cos(angle)) / 110540 // meters to degrees lat
      const lngOffset =
        (distance * Math.sin(angle)) /
        (111320 * Math.cos((transitStop.location.lat * Math.PI) / 180)) // meters to degrees lng

      const origin: Point = {
        lat: transitStop.location.lat + latOffset,
        lng: transitStop.location.lng + lngOffset,
      }

      // Destination could be the stop itself or another random point
      const destination: Point =
        getSecureRandomFloat() < 0.7 // 70% go to the stop
          ? transitStop.location
          : {
              lat: transitStop.location.lat + (getSecureRandomFloat() - 0.5) * 0.01,
              lng: transitStop.location.lng + (getSecureRandomFloat() - 0.5) * 0.01,
            }

      trips.push({
        origin,
        destination,
        targetStop: transitStop,
      })
    }

    return trips
  }

  // Update agent based on time progression
  public updateAgent(agent: PedestrianAgent, deltaTime: number): void {
    if (agent.isAtDestination) return

    // Update position based on velocity
    const speedMetersPerSecond = agent.walkingSpeed / 60
    const deltaX = agent.velocity.x * speedMetersPerSecond * deltaTime
    const deltaY = agent.velocity.y * speedMetersPerSecond * deltaTime

    // Convert to lat/lng changes
    const latChange = deltaY / 110540
    const lngChange =
      deltaX / (111320 * Math.cos((agent.currentPosition.lat * Math.PI) / 180))

    agent.currentPosition.lat += latChange
    agent.currentPosition.lng += lngChange

    agent.lastUpdate = Date.now()
  }
}