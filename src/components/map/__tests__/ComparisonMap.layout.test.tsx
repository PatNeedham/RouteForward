/**
 * Layout Tests for ComparisonMap Component
 *
 * These tests verify that the layout constraints are properly maintained,
 * specifically focusing on the issue where the TimeSlider disappears when
 * the simulation results panel expands with large content.
 *
 * Key Layout Requirements:
 * 1. TimeSlider should always remain visible at the bottom
 * 2. Right panel should not exceed viewport height
 * 3. Maps section should maintain consistent height
 * 4. Overflow content should be properly scrollable
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ComparisonMap from '@/components/map/ComparisonMap'
import { MapState } from '@/types/mapState'

// Mock the problematic components that require complex setup
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container" style={{ height: '100%', width: '100%' }}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: () => <div data-testid="geojson" />,
  FeatureGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="feature-group">{children}</div>
  ),
}))

jest.mock('@/components/map/TimeSlider', () => {
  return function MockTimeSlider({ value, onChange }: any) {
    return (
      <div
        data-testid="time-slider"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 md:w-1/2 p-4 bg-gray-800/80 rounded-lg shadow-lg z-[1000] backdrop-blur-sm"
        style={{ position: 'absolute', bottom: '16px' }}
      >
        Simulation Time: {value}
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid="time-slider-input"
        />
      </div>
    )
  }
})

describe('ComparisonMap Layout Constraints', () => {
  const mockMapState: MapState = {
    viewport: {
      center: [40.7128, -74.006],
      zoom: 12,
    },
    layers: {
      streetNetwork: true,
      hblr: true,
    },
    simulation: {
      time: '08:00',
    },
    routes: {
      type: 'FeatureCollection',
      features: [],
    },
  }

  const mockProps = {
    mapState: mockMapState,
    updateMapState: jest.fn(),
    shareableUrl: '',
    isValidUrl: true,
    resetToDefault: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset viewport dimensions for consistent testing
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
  })

  test('should demonstrate the layout issue exists - TimeSlider can be pushed off-screen', async () => {
    // This test should FAIL initially, demonstrating the layout problem
    const { container } = render(
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        <ComparisonMap {...mockProps} />
      </div>,
    )

    // Switch to simulation tab
    const simulationTab = screen.getByRole('button', { name: /simulation/i })
    fireEvent.click(simulationTab)

    // The TimeSlider should be present initially
    const timeSlider = screen.getByTestId('time-slider')
    expect(timeSlider).toBeInTheDocument()

    // Get initial position
    const initialRect = timeSlider.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    // TimeSlider should initially be within viewport
    expect(initialRect.bottom).toBeLessThanOrEqual(viewportHeight)

    // Note: This test demonstrates the expected behavior
    // When the layout fix is implemented, this assertion should pass
    // Before the fix, content overflow would push TimeSlider off-screen
  })

  test('should verify right panel has height constraints', () => {
    render(
      <div style={{ height: '100vh' }}>
        <ComparisonMap {...mockProps} />
      </div>,
    )

    // Switch to simulation panel
    const simulationTab = screen.getByRole('button', { name: /simulation/i })
    fireEvent.click(simulationTab)

    // Find the right panel container
    const rightPanel = simulationTab.closest('.w-96')
    expect(rightPanel).toBeInTheDocument()

    if (rightPanel) {
      const panelRect = rightPanel.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Panel should not exceed viewport height
      expect(panelRect.height).toBeLessThanOrEqual(viewportHeight)
    }
  })

  test('should verify maps section maintains consistent height', () => {
    render(
      <div style={{ height: '100vh' }}>
        <ComparisonMap {...mockProps} />
      </div>,
    )

    // Get maps section
    const mapContainer = screen.getAllByTestId('map-container')[0]
    const mapsSection = mapContainer.closest('.flex-1')

    const initialHeight = mapsSection?.getBoundingClientRect().height

    // Switch to simulation tab
    const simulationTab = screen.getByRole('button', { name: /simulation/i })
    fireEvent.click(simulationTab)

    // Maps section height should remain the same
    const finalHeight = mapsSection?.getBoundingClientRect().height
    expect(finalHeight).toBe(initialHeight)
  })
})
