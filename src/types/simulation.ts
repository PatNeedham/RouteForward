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