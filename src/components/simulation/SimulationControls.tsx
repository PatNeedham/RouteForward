'use client'

import { useState } from 'react'
import { Play, Settings, Clock } from 'lucide-react'

interface SimulationControlsProps {
  onRunSimulation: (_config: SimulationControlConfig) => void
  isLoading: boolean
}

export interface SimulationControlConfig {
  timeOfDay: number // minutes from midnight
  tripCount: number
  scenario: 'rush-hour' | 'off-peak' | 'custom'
  customTime?: string
}

export default function SimulationControls({
  onRunSimulation,
  isLoading,
}: SimulationControlsProps) {
  const [timeOfDay, setTimeOfDay] = useState<number>(480) // 8 AM default
  const [tripCount, setTripCount] = useState<number>(25)
  const [scenario, setScenario] = useState<'rush-hour' | 'off-peak' | 'custom'>(
    'rush-hour',
  )
  const [customTime, setCustomTime] = useState<string>('08:00')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  const handleScenarioChange = (
    newScenario: 'rush-hour' | 'off-peak' | 'custom',
  ) => {
    setScenario(newScenario)

    switch (newScenario) {
      case 'rush-hour':
        setTimeOfDay(480) // 8 AM
        break
      case 'off-peak':
        setTimeOfDay(600) // 10 AM
        break
      case 'custom':
        // Use custom time
        break
    }
  }

  const handleCustomTimeChange = (time: string) => {
    setCustomTime(time)
    const [hours, minutes] = time.split(':').map(Number)
    setTimeOfDay(hours * 60 + minutes)
  }

  const handleRunSimulation = () => {
    const config: SimulationControlConfig = {
      timeOfDay,
      tripCount,
      scenario,
      customTime: scenario === 'custom' ? customTime : undefined,
    }

    onRunSimulation(config)
  }

  const formatTimeOfDay = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Settings className="w-5 h-5 mr-2" />
        Simulation Settings
      </h3>

      {/* Scenario Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Scenario
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleScenarioChange('rush-hour')}
            className={`p-3 text-sm rounded-lg border ${
              scenario === 'rush-hour'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Rush Hour
            <div className="text-xs text-gray-500">8:00 AM</div>
          </button>

          <button
            onClick={() => handleScenarioChange('off-peak')}
            className={`p-3 text-sm rounded-lg border ${
              scenario === 'off-peak'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Off-Peak
            <div className="text-xs text-gray-500">10:00 AM</div>
          </button>

          <button
            onClick={() => handleScenarioChange('custom')}
            className={`p-3 text-sm rounded-lg border ${
              scenario === 'custom'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Custom
            <div className="text-xs text-gray-500">Set time</div>
          </button>
        </div>
      </div>

      {/* Custom Time Input */}
      {scenario === 'custom' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Time
          </label>
          <input
            type="time"
            value={customTime}
            onChange={(e) => handleCustomTimeChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            Selected: {formatTimeOfDay(timeOfDay)}
          </div>
        </div>
      )}

      {/* Trip Count */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Trips to Simulate
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={tripCount}
            onChange={(e) => setTripCount(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-700 w-12">
            {tripCount}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          More trips = more accurate results but slower processing
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Advanced Settings
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">
                Walking Speed (m/min)
              </label>
              <div className="text-gray-800">Normal: 80, Rush: 70</div>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">
                Bus Speed (m/min)
              </label>
              <div className="text-gray-800">Normal: 400, Rush: 300</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Speed adjustments are automatically applied based on selected time
            scenario
          </div>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={handleRunSimulation}
        disabled={isLoading}
        className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium ${
          isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Run Simulation
          </>
        )}
      </button>

      {/* Performance Notice */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Simulation runs in under 5 seconds for basic scenarios
      </div>
    </div>
  )
}
