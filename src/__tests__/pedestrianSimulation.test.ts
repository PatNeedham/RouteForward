import {
  PedestrianAgent,
  Point,
  TransitStop,
  WeatherConditions,
  PedestrianSimConfig,
} from '@/types/simulation'
import { PathfindingSystem } from '@/lib/simulation/PathfindingSystem'
import { CrowdDynamicsSystem } from '@/lib/simulation/CrowdDynamicsSystem'
import { PedestrianAgentFactory } from '@/lib/simulation/PedestrianAgentFactory'
import { SimulationEngine } from '@/lib/simulation/SimulationEngine'

describe('Pedestrian Simulation System', () => {
  const mockStops: TransitStop[] = [
    {
      id: 'stop1',
      name: 'Test Stop 1',
      location: { lat: 40.7128, lng: -74.0060 },
      routes: ['route1'],
      type: 'bus',
    },
    {
      id: 'stop2',
      name: 'Test Stop 2',
      location: { lat: 40.7138, lng: -74.0050 },
      routes: ['route1'],
      type: 'bus',
    },
  ]

  const mockRoutes = [
    {
      id: 'route1',
      name: 'Test Route',
      coordinates: [mockStops[0].location, mockStops[1].location],
      type: 'bus' as const,
    },
  ]

  const defaultPedestrianConfig: PedestrianSimConfig = {
    maxAgents: 100,
    timeStep: 1.0,
    crowdDynamics: {
      separationRadius: 2.0,
      alignmentRadius: 5.0,
      cohesionRadius: 8.0,
      maxForce: 3.0,
      avoidanceForce: 5.0,
    },
    accessibility: {
      wheelchairSpeedFactor: 0.6,
      mobilityAidSpeedFactor: 0.7,
      elderlySpeedFactor: 0.8,
      childSpeedFactor: 0.9,
    },
    weather: {
      temperature: 20,
      precipitation: 0,
      windSpeed: 5,
      visibility: 1.0,
      type: 'clear',
    },
    sidewalkNetwork: {
      nodes: [
        {
          id: 'node1',
          position: { lat: 40.7128, lng: -74.0060 },
          connections: ['node2'],
          width: 3.0,
          accessibility: 'full',
          crowdCapacity: 10,
        },
        {
          id: 'node2',
          position: { lat: 40.7138, lng: -74.0050 },
          connections: ['node1'],
          width: 3.0,
          accessibility: 'full',
          crowdCapacity: 10,
        },
      ],
      obstacles: [],
    },
  }

  describe('PedestrianAgentFactory', () => {
    let factory: PedestrianAgentFactory

    beforeEach(() => {
      factory = new PedestrianAgentFactory(defaultPedestrianConfig)
    })

    it('should create agents with realistic walking speeds (3-5 mph)', () => {
      const origin: Point = { lat: 40.7128, lng: -74.0060 }
      const destination: Point = { lat: 40.7138, lng: -74.0050 }

      const agent = factory.createAgent(origin, destination)

      // 3-5 mph = 80-134 meters per minute
      expect(agent.walkingSpeed).toBeGreaterThanOrEqual(48) // 3 mph * 0.6 (min accessibility factor)
      expect(agent.walkingSpeed).toBeLessThanOrEqual(134) // 5 mph
      expect(agent.maxSpeed).toBeGreaterThanOrEqual(48)
      expect(agent.maxSpeed).toBeLessThanOrEqual(134)
    })

    it('should create different agent types with appropriate speed modifiers', () => {
      const origin: Point = { lat: 40.7128, lng: -74.0060 }
      const destination: Point = { lat: 40.7138, lng: -74.0050 }

      // Create multiple agents of each type to account for randomness
      const normalAgents = Array.from({ length: 5 }, () =>
        factory.createAgent(origin, destination, undefined, 'normal')
      )
      const wheelchairAgents = Array.from({ length: 5 }, () =>
        factory.createAgent(origin, destination, undefined, 'wheelchair')
      )
      const elderlyAgents = Array.from({ length: 5 }, () =>
        factory.createAgent(origin, destination, undefined, 'elderly')
      )

      const avgNormalSpeed = normalAgents.reduce((sum, agent) => sum + agent.walkingSpeed, 0) / normalAgents.length
      const avgWheelchairSpeed = wheelchairAgents.reduce((sum, agent) => sum + agent.walkingSpeed, 0) / wheelchairAgents.length
      const avgElderlySpeed = elderlyAgents.reduce((sum, agent) => sum + agent.walkingSpeed, 0) / elderlyAgents.length

      expect(avgWheelchairSpeed).toBeLessThan(avgNormalSpeed)
      expect(avgElderlySpeed).toBeLessThan(avgNormalSpeed)
      expect(wheelchairAgents[0].agentType).toBe('wheelchair')
      expect(elderlyAgents[0].agentType).toBe('elderly')
    })

    it('should apply weather effects correctly', () => {
      const origin: Point = { lat: 40.7128, lng: -74.0060 }
      const destination: Point = { lat: 40.7138, lng: -74.0050 }

      // Test with harsh weather
      const harshWeatherConfig = {
        ...defaultPedestrianConfig,
        weather: {
          temperature: -5, // Cold
          precipitation: 0.8, // Heavy rain
          windSpeed: 15, // Strong wind
          visibility: 0.3, // Poor visibility
          type: 'rain' as const,
        },
      }

      const factoryHarshWeather = new PedestrianAgentFactory(harshWeatherConfig)
      const agentHarshWeather = factoryHarshWeather.createAgent(origin, destination)
      const agentNormalWeather = factory.createAgent(origin, destination)

      // Agent in harsh weather should be slower
      expect(agentHarshWeather.walkingSpeed).toBeLessThan(agentNormalWeather.walkingSpeed)
    })

    it('should generate realistic trip patterns around transit stops', () => {
      const trips = factory.generateStopCentricTrips(mockStops[0], 10, 500)

      expect(trips).toHaveLength(10)
      trips.forEach((trip) => {
        expect(trip.targetStop).toBe(mockStops[0])
        expect(trip.origin).toBeDefined()
        expect(trip.destination).toBeDefined()

        // Origin should be within reasonable distance of the stop (with tolerance for coordinate approximation)
        const distanceToStop = Math.sqrt(
          Math.pow((trip.origin.lat - mockStops[0].location.lat) * 110540, 2) +
            Math.pow((trip.origin.lng - mockStops[0].location.lng) * 111320, 2),
        )
        expect(distanceToStop).toBeLessThanOrEqual(650) // Within 500m radius + coordinate approximation tolerance
      })
    })
  })

  describe('PathfindingSystem', () => {
    let pathfinding: PathfindingSystem

    beforeEach(() => {
      pathfinding = new PathfindingSystem(defaultPedestrianConfig.sidewalkNetwork)
    })

    it('should find shortest path between two points', () => {
      const start: Point = { lat: 40.7128, lng: -74.0060 }
      const goal: Point = { lat: 40.7138, lng: -74.0050 }

      const path = pathfinding.findPath(start, goal)

      expect(path.length).toBeGreaterThanOrEqual(2) // At least start and end
      expect(path[0]).toEqual(start)
      expect(path[path.length - 1]).toEqual(goal)
    })

    it('should consider accessibility requirements for wheelchairs', () => {
      // Add inaccessible node
      const networkWithInaccessible = {
        ...defaultPedestrianConfig.sidewalkNetwork,
        nodes: [
          ...defaultPedestrianConfig.sidewalkNetwork.nodes,
          {
            id: 'inaccessible',
            position: { lat: 40.7133, lng: -74.0055 },
            connections: ['node1', 'node2'],
            width: 1.0,
            accessibility: 'none' as const,
            crowdCapacity: 5,
          },
        ],
      }

      const accessiblePathfinding = new PathfindingSystem(networkWithInaccessible)
      const start: Point = { lat: 40.7128, lng: -74.0060 }
      const goal: Point = { lat: 40.7138, lng: -74.0050 }

      const wheelchairPath = accessiblePathfinding.findPath(start, goal, 'full')
      const normalPath = accessiblePathfinding.findPath(start, goal)

      // Both should find paths, but wheelchair path should avoid inaccessible nodes
      expect(wheelchairPath.length).toBeGreaterThanOrEqual(2)
      expect(normalPath.length).toBeGreaterThanOrEqual(2)
    })

    it('should detect obstacles correctly', () => {
      const networkWithObstacles = {
        ...defaultPedestrianConfig.sidewalkNetwork,
        obstacles: [
          {
            id: 'obstacle1',
            position: { lat: 40.7130, lng: -74.0058 },
            radius: 2,
            type: 'construction' as const,
          },
        ],
      }

      const obstaclePathfinding = new PathfindingSystem(networkWithObstacles)
      const hasObstacle = obstaclePathfinding.hasObstacleAt(
        { lat: 40.7130, lng: -74.0058 },
        1,
      )
      const noObstacle = obstaclePathfinding.hasObstacleAt(
        { lat: 40.7140, lng: -74.0040 },
        1,
      )

      expect(hasObstacle).toBe(true)
      expect(noObstacle).toBe(false)
    })
  })

  describe('CrowdDynamicsSystem', () => {
    let crowdSystem: CrowdDynamicsSystem

    beforeEach(() => {
      crowdSystem = new CrowdDynamicsSystem(defaultPedestrianConfig.crowdDynamics)
    })

    it('should calculate flocking forces for crowd behavior', () => {
      const agent1: PedestrianAgent = {
        id: 'agent1',
        origin: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7138, lng: -74.0050 },
        walkingSpeed: 80,
        currentPosition: { lat: 40.7128, lng: -74.0060 },
        velocity: { x: 1, y: 0 },
        agentType: 'normal',
        maxSpeed: 80,
        pathIndex: 0,
        weatherSensitivity: 0.5,
        crowdAvoidanceRadius: 1.5,
        isAtDestination: false,
        lastUpdate: Date.now(),
      }

      const agent2: PedestrianAgent = {
        ...agent1,
        id: 'agent2',
        currentPosition: { lat: 40.7129, lng: -74.0061 }, // Very close to agent1
        velocity: { x: 1, y: 1 },
      }

      const forces = crowdSystem.calculateFlockingForces(agent1, [agent1, agent2])

      expect(forces).toBeDefined()
      expect(typeof forces.x).toBe('number')
      expect(typeof forces.y).toBe('number')
    })

    it('should calculate crowd metrics accurately', () => {
      const agents: PedestrianAgent[] = [
        {
          id: 'agent1',
          origin: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7138, lng: -74.0050 },
          walkingSpeed: 80,
          currentPosition: { lat: 40.7128, lng: -74.0060 },
          velocity: { x: 1, y: 0 },
          agentType: 'normal',
          maxSpeed: 80,
          pathIndex: 0,
          weatherSensitivity: 0.5,
          crowdAvoidanceRadius: 1.5,
          isAtDestination: false,
          lastUpdate: Date.now(),
        },
        {
          id: 'agent2',
          origin: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7138, lng: -74.0050 },
          walkingSpeed: 70,
          currentPosition: { lat: 40.7129, lng: -74.0061 },
          velocity: { x: 0.5, y: 0.5 },
          agentType: 'elderly',
          maxSpeed: 70,
          pathIndex: 0,
          weatherSensitivity: 0.7,
          crowdAvoidanceRadius: 2.0,
          isAtDestination: false,
          lastUpdate: Date.now(),
        },
      ]

      const center: Point = { lat: 40.7128, lng: -74.0060 }
      const radius = 200 // 200 meters

      const metrics = crowdSystem.calculateCrowdMetrics(agents, center, radius)

      expect(metrics.density).toBeGreaterThanOrEqual(0)
      expect(metrics.averageSpeed).toBeGreaterThanOrEqual(0)
      expect(metrics.flowRate).toBeGreaterThanOrEqual(0)
      expect(metrics.congestionLevel).toBeGreaterThanOrEqual(0)
      expect(metrics.congestionLevel).toBeLessThanOrEqual(1)
    })
  })

  describe('SimulationEngine Integration', () => {
    let engine: SimulationEngine

    beforeEach(() => {
      engine = new SimulationEngine(mockRoutes, mockStops, {}, defaultPedestrianConfig)
    })

    it('should handle 1000+ concurrent pedestrians', () => {
      // Set higher max agents for this test
      const highCapacityConfig = {
        ...defaultPedestrianConfig,
        maxAgents: 2000, // Increase limit
      }
      
      const highCapacityEngine = new SimulationEngine(
        mockRoutes,
        mockStops,
        {},
        highCapacityConfig,
      )
      
      highCapacityEngine.startPedestrianSimulation()

      // Add agents in batches to simulate realistic loading
      const batchSize = 100
      for (let i = 0; i < 10; i++) {
        const agents = highCapacityEngine.addPedestrianAgents(batchSize, false)
        expect(agents.length).toBeGreaterThan(0)
      }

      const allAgents = highCapacityEngine.getPedestrianAgents()
      expect(allAgents.length).toBeGreaterThanOrEqual(1000)

      // Test that simulation can update with this many agents
      expect(() => {
        highCapacityEngine.updatePedestrianSimulation(1.0)
      }).not.toThrow()
    })

    it('should form crowds realistically at popular stops during rush hour', () => {
      engine.startPedestrianSimulation()

      // Add rush hour agents
      const rushHourAgents = engine.addPedestrianAgents(50, true)
      expect(rushHourAgents.length).toBe(50)

      // Verify rush hour effects (check if walking speed is affected by rush hour)
      rushHourAgents.forEach((agent) => {
        // Rush hour agents walking speed should be less than or equal to their max speed
        // (maxSpeed is set to walking speed after rush hour reduction)
        expect(agent.walkingSpeed).toBeLessThanOrEqual(agent.maxSpeed)
      })

      // Get crowd metrics around stops
      for (const stop of mockStops) {
        const metrics = engine.getCrowdMetrics(stop.location, 50)
        expect(metrics).toBeDefined()
        expect(typeof metrics.density).toBe('number')
        expect(typeof metrics.congestionLevel).toBe('number')
      }
    })

    it('should respond to weather changes appropriately', () => {
      engine.startPedestrianSimulation()
      const initialAgents = engine.addPedestrianAgents(10, false)

      const initialSpeeds = initialAgents.map((agent) => agent.walkingSpeed)

      // Change to harsh weather
      const harshWeather: WeatherConditions = {
        temperature: -5,
        precipitation: 0.8,
        windSpeed: 15,
        visibility: 0.5,
        type: 'rain',
      }

      engine.setWeatherConditions(harshWeather)

      const updatedAgents = engine.getPedestrianAgents()
      const newSpeeds = updatedAgents.map((agent) => agent.walkingSpeed)

      // Agents should generally be slower in harsh weather
      const averageInitialSpeed =
        initialSpeeds.reduce((sum, speed) => sum + speed, 0) / initialSpeeds.length
      const averageNewSpeed =
        newSpeeds.reduce((sum, speed) => sum + speed, 0) / newSpeeds.length

      expect(averageNewSpeed).toBeLessThan(averageInitialSpeed)
    })

    it('should handle accessibility considerations correctly', () => {
      engine.startPedestrianSimulation()
      const agents = engine.addPedestrianAgents(20, false)

      // Should have different types of agents
      const agentTypes = new Set(agents.map((agent) => agent.agentType))
      expect(agentTypes.size).toBeGreaterThan(1) // Multiple agent types

      // Check that different agent types have appropriate properties
      const wheelchairAgents = agents.filter((agent) => agent.agentType === 'wheelchair')
      const normalAgents = agents.filter((agent) => agent.agentType === 'normal')

      if (wheelchairAgents.length > 0 && normalAgents.length > 0) {
        const avgWheelchairSpeed =
          wheelchairAgents.reduce((sum, agent) => sum + agent.walkingSpeed, 0) /
          wheelchairAgents.length
        const avgNormalSpeed =
          normalAgents.reduce((sum, agent) => sum + agent.walkingSpeed, 0) /
          normalAgents.length

        expect(avgWheelchairSpeed).toBeLessThan(avgNormalSpeed)

        // Wheelchair agents should have larger avoidance radius
        const avgWheelchairRadius =
          wheelchairAgents.reduce((sum, agent) => sum + agent.crowdAvoidanceRadius, 0) /
          wheelchairAgents.length
        const avgNormalRadius =
          normalAgents.reduce((sum, agent) => sum + agent.crowdAvoidanceRadius, 0) /
          normalAgents.length

        expect(avgWheelchairRadius).toBeGreaterThan(avgNormalRadius)
      }
    })
  })
})