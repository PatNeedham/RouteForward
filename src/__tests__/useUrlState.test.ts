import { renderHook, act } from '@testing-library/react'
import { useUrlState } from '@/hooks/useUrlState'
import { DEFAULT_MAP_STATE } from '@/types/mapState'

// Mock next/navigation with more control
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/map/jersey-city',
}))

describe('useUrlState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should initialize with default map state', () => {
    const { result } = renderHook(() => useUrlState())
    
    expect(result.current.mapState).toEqual(DEFAULT_MAP_STATE)
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

    // Then change viewport  
    act(() => {
      result.current.updateMapState({
        viewport: { center: [40.7589, -73.9851], zoom: 15 },
      })
    })

    // Time should be preserved - this validates the critical bug fix
    expect(result.current.mapState.simulation.time).toBe('14:00')
    expect(result.current.mapState.viewport.center).toEqual([40.7589, -73.9851])
  })

  it('should update map state independently', () => {
    const { result } = renderHook(() => useUrlState())
    
    act(() => {
      result.current.updateMapState({
        viewport: {
          center: [40.7589, -73.9851],
          zoom: 15,
        },
      })
    })

    expect(result.current.mapState.viewport.center).toEqual([40.7589, -73.9851])
    expect(result.current.mapState.viewport.zoom).toBe(15)
    expect(result.current.shareableUrl).toContain('/map/jersey-city')
  })
})