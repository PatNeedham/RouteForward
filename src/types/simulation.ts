export interface Point {
  lat: number
  lng: number
}

export interface RouteSegment {
  id: string
  name: string
  coordinates: Point[]
  color?: string
  type: 'bus' | 'rail' | 'walking'
}

export interface TransitStop {
  id: string
  name: string
  location: Point
  routes: string[]
  type: 'bus' | 'rail'
}

export interface PedestrianAgent {
  id: string
  origin: Point
  destination: Point
  walkingSpeed: number // meters per minute
  currentPosition: Point
  route?: Point[]
  // Enhanced properties for agent-based simulation
  velocity: { x: number; y: number }
  agentType: 'normal' | 'wheelchair' | 'mobility_aid' | 'elderly' | 'child'
  maxSpeed: number // meters per minute (3-5 mph = 80-134 m/min)
  targetStop?: TransitStop
  pathIndex: number
  weatherSensitivity: number // 0-1, how much weather affects this agent
  crowdAvoidanceRadius: number // meters
  isAtDestination: boolean
  lastUpdate: number
}

export interface BusAgent {
  id: string
  routeId: string
  currentPosition: Point
  speed: number // meters per minute
  capacity: number
  passengers: number
  schedule: ScheduleEntry[]
}

export interface ScheduleEntry {
  stopId: string
  arrivalTime: number // minutes from start of simulation
  departureTime: number
}

export interface TravelTimeResult {
  origin: Point
  destination: Point
  duration: number // minutes
  confidence: number // 0-1
  route: RouteSegment[]
  mode: 'walking' | 'bus' | 'rail' | 'mixed'
}

export interface SimulationConfig {
  duration: number // simulation duration in minutes
  timeStep: number // simulation step in minutes
  rushHourPeriods: TimeWindow[]
  walkingSpeed: {
    normal: number
    rushHour: number
  }
  busSpeed: {
    normal: number
    rushHour: number
  }
}

export interface TimeWindow {
  start: number // minutes from midnight
  end: number
  speedMultiplier: number
}

export interface SimulationResult {
  travelTimes: TravelTimeResult[]
  averageWaitTime: number
  totalSimulationTime: number
  confidence: number
  scenario: 'current' | 'proposed'
}

export interface ComparisonResult {
  current: SimulationResult
  proposed: SimulationResult
  improvements: {
    averageTimeSaved: number
    percentImprovement: number
    affectedRoutes: string[]
  }
}

// Weather system for pedestrian simulation
export interface WeatherConditions {
  temperature: number // Celsius
  precipitation: number // 0-1 (0 = none, 1 = heavy)
  windSpeed: number // m/s
  visibility: number // 0-1 (0 = no visibility, 1 = clear)
  type: 'clear' | 'rain' | 'snow' | 'fog' | 'wind'
}

// Sidewalk network for pathfinding
export interface SidewalkNode {
  id: string
  position: Point
  connections: string[] // IDs of connected nodes
  width: number // meters
  accessibility: 'full' | 'limited' | 'none' // wheelchair accessibility
  crowdCapacity: number // max people per meter
}

export interface SidewalkNetwork {
  nodes: SidewalkNode[]
  obstacles: Obstacle[]
}

export interface Obstacle {
  id: string
  position: Point
  radius: number // meters
  type: 'construction' | 'furniture' | 'building' | 'temporary'
}

// Crowd dynamics
export interface CrowdMetrics {
  density: number // people per square meter
  averageSpeed: number // current average speed in area
  flowRate: number // people per minute through area
  congestionLevel: number // 0-1 (0 = free flow, 1 = gridlock)
}

// Pedestrian simulation configuration
export interface PedestrianSimConfig {
  maxAgents: number
  timeStep: number // simulation step in seconds
  crowdDynamics: {
    separationRadius: number // meters
    alignmentRadius: number
    cohesionRadius: number
    maxForce: number
    avoidanceForce: number
  }
  accessibility: {
    wheelchairSpeedFactor: number // 0-1 multiplier
    mobilityAidSpeedFactor: number
    elderlySpeedFactor: number
    childSpeedFactor: number
  }
  weather: WeatherConditions
  sidewalkNetwork: SidewalkNetwork
}
