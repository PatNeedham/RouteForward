import { renderHook, act } from '@testing-library/react'
import { useUrlState } from '@/hooks/useUrlState'
import { DEFAULT_MAP_STATE } from '@/types/mapState'

// Mock next/navigation with controlled behavior
const mockPush = jest.fn()
const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/map/jersey-city',
}))

// Mock window object for jsdom
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

describe('useUrlState Hook', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    // Reset search params
    mockSearchParams = new URLSearchParams()
    // Clear timers and use fake ones
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    // Clean up timers
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should initialize with default map state', () => {
    const { result } = renderHook(() => useUrlState())

    expect(result.current.mapState.viewport).toEqual(DEFAULT_MAP_STATE.viewport)
    expect(result.current.mapState.simulation).toEqual(
      DEFAULT_MAP_STATE.simulation,
    )
    expect(result.current.isValidUrl).toBe(true)
  })

  it('should preserve simulation time when viewport changes', () => {
    const { result } = renderHook(() => useUrlState())

    // Set a custom time first
    act(() => {
      result.current.updateMapState({
        simulation: { time: '14:00' },
      })
    })

    // Fast forward timers to process debounced updates
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Then change viewport
    act(() => {
      result.current.updateMapState({
        viewport: { center: [40.7589, -73.9851], zoom: 15 },
      })
    })

    // Fast forward timers again
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Time should be preserved - this validates the critical bug fix
    expect(result.current.mapState.simulation.time).toBe('14:00')
    expect(result.current.mapState.viewport.center).toEqual([40.7589, -73.9851])
  })

  it('should generate shareable URLs', () => {
    const { result } = renderHook(() => useUrlState())

    expect(result.current.shareableUrl).toContain('/map/jersey-city')
    expect(result.current.shareableUrl).toMatch(/^http:\/\/localhost:3000/)
  })
})
