'use client'

import { useState } from 'react'
import { ComparisonResult, TravelTimeResult } from '@/types/simulation'
import { Clock, TrendingUp, TrendingDown, Route, Users } from 'lucide-react'

interface SimulationResultsProps {
  result: ComparisonResult | null
  isLoading: boolean
}

export default function SimulationResults({ result, isLoading }: SimulationResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
        <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Run a simulation to see results here</p>
      </div>
    )
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  }

  const getImprovementColor = (improvement: number): string => {
    if (improvement > 0) return 'text-green-600'
    if (improvement < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 0) return <TrendingUp className="w-4 h-4" />
    if (improvement < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  const currentAverage = result.current.travelTimes.reduce((sum, t) => sum + t.duration, 0) / result.current.travelTimes.length
  const proposedAverage = result.proposed.travelTimes.reduce((sum, t) => sum + t.duration, 0) / result.proposed.travelTimes.length

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'details'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Trip Details
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Simulation Results
            </h3>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Current Average</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatTime(currentAverage)}
                </div>
                <div className="text-xs text-blue-600">
                  Confidence: {formatConfidence(result.current.confidence)}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Proposed Average</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatTime(proposedAverage)}
                </div>
                <div className="text-xs text-green-600">
                  Confidence: {formatConfidence(result.proposed.confidence)}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 font-medium">Improvement</div>
                <div className={`text-2xl font-bold flex items-center ${getImprovementColor(result.improvements.percentImprovement)}`}>
                  {getImprovementIcon(result.improvements.percentImprovement)}
                  <span className="ml-1">
                    {result.improvements.percentImprovement > 0 ? '+' : ''}
                    {result.improvements.percentImprovement.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {formatTime(Math.abs(result.improvements.averageTimeSaved))} saved
                </div>
              </div>
            </div>

            {/* Performance Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Simulation Performance</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="ml-2 font-medium">
                    {result.current.totalSimulationTime.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Trips Analyzed:</span>
                  <span className="ml-2 font-medium">
                    {result.current.travelTimes.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Affected Routes */}
            {result.improvements.affectedRoutes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Route className="w-4 h-4 mr-2" />
                  Affected Routes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.improvements.affectedRoutes.map((route, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                    >
                      {route}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Individual Trip Analysis
            </h3>

            <div className="space-y-4">
              {result.current.travelTimes.slice(0, 10).map((trip, index) => {
                const proposedTrip = result.proposed.travelTimes[index]
                const timeDiff = trip.duration - proposedTrip.duration

                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">Trip {index + 1}</div>
                      <div className={`text-sm flex items-center ${getImprovementColor(timeDiff)}`}>
                        {getImprovementIcon(timeDiff)}
                        <span className="ml-1">
                          {timeDiff > 0 ? '-' : '+'}
                          {formatTime(Math.abs(timeDiff))}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Current</div>
                        <div className="font-medium">{formatTime(trip.duration)}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          via {trip.mode} ({formatConfidence(trip.confidence)} confidence)
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Proposed</div>
                        <div className="font-medium">{formatTime(proposedTrip.duration)}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          via {proposedTrip.mode} ({formatConfidence(proposedTrip.confidence)} confidence)
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {result.current.travelTimes.length > 10 && (
                <div className="text-center text-gray-500 text-sm">
                  Showing first 10 of {result.current.travelTimes.length} trips
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}