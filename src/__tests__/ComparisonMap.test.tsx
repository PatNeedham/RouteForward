import { render, screen } from '@testing-library/react'
import ComparisonMap from '@/components/map/ComparisonMap'
import { DEFAULT_MAP_STATE } from '@/types/mapState'

// Mock the JSON data
jest.mock('@/data/jersey-city/hblr.json', () => ({
  type: 'FeatureCollection',
  features: [],
}))

jest.mock('@/data/jersey-city/street-network.json', () => ({
  type: 'FeatureCollection',
  features: [],
}))

describe('ComparisonMap', () => {
  const mockProps = {
    mapState: DEFAULT_MAP_STATE,
    updateMapState: jest.fn(),
    shareableUrl: 'http://localhost:3000/map/jersey-city',
    isValidUrl: true,
    resetToDefault: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders two map containers', () => {
    render(<ComparisonMap {...mockProps} />)

    const mapContainers = screen.getAllByTestId('map-container')
    expect(mapContainers).toHaveLength(2)
  })

  it('renders Current State and Enhanced Transit headers', () => {
    render(<ComparisonMap {...mockProps} />)

    expect(screen.getByText('Current State')).toBeTruthy()
    expect(screen.getByText('Enhanced Transit')).toBeTruthy()
  })

  it('renders TimeSlider component', () => {
    render(<ComparisonMap {...mockProps} />)

    // TimeSlider should be rendered (it contains a slider input)
    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
  })

  it('handles invalid URL state', () => {
    const invalidProps = {
      ...mockProps,
      isValidUrl: false,
    }

    render(<ComparisonMap {...invalidProps} />)

    expect(screen.getByText('Invalid URL State')).toBeTruthy()
    expect(screen.getByText('Reset to Default')).toBeTruthy()
  })

  it('does not render maps when URL is invalid', () => {
    const invalidProps = {
      ...mockProps,
      isValidUrl: false,
    }

    render(<ComparisonMap {...invalidProps} />)

    const mapContainers = screen.queryAllByTestId('map-container')
    expect(mapContainers).toHaveLength(0)
  })
})
